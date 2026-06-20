# Deploying Scheduler to a Vultr server

This guide deploys the app to a single Vultr Cloud Compute instance using Docker
Compose. Everything runs on one box: the **Next.js app**, **PostgreSQL**, and
**Caddy** (which terminates HTTPS and auto-renews Let's Encrypt certificates).

Files used here, all in the `scheduler/` directory:

- `Dockerfile` — builds the app image (Next.js standalone output)
- `docker-entrypoint.sh` — runs `prisma migrate deploy`, then starts the server
- `docker-compose.prod.yml` — app + Postgres + Caddy (+ a one-off seed job)
- `Caddyfile` — reverse proxy + automatic HTTPS
- `deploy.sh` — build & (re)start helper

---

## 1. Create the Vultr server

1. In the Vultr dashboard: **Deploy → Cloud Compute**.
2. Choose a region near your users, **Ubuntu 24.04 LTS**, and at least
   **1 vCPU / 2 GB RAM** (2 GB recommended — Next.js builds are memory-hungry).
3. Add your SSH key, deploy, and note the server's public IP.
4. Point your domain's **A record** at that IP (e.g. `app.yourdomain.com → <IP>`).
   HTTPS won't work until DNS resolves to the server.

SSH in:

```bash
ssh root@<SERVER_IP>
```

## 2. Install Docker

```bash
apt-get update && apt-get install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
docker --version && docker compose version
```

## 3. Get the code onto the server (via git)

The workflow is: **push from your laptop → clone/pull on the server.**

Repo: `https://github.com/MichelFayad/scheduler` — the app lives at the repo root.

**First time only**, push your local app to the repo. Run this in your local
`scheduler/` folder (the one with `package.json` and these deploy files):

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/MichelFayad/scheduler.git
git push -u origin main
```

On the server, clone it once (if the repo is private, add the server's SSH
deploy key to GitHub first):

```bash
git clone https://github.com/MichelFayad/scheduler.git /opt/scheduler-app
cd /opt/scheduler-app
```

> `.env.production` is git-ignored, so it never goes into the repo — you create
> it directly on the server in the next step, and it survives every `git pull`.

## 4. Configure environment variables

Create `.env.production` from the example and fill in real values:

```bash
cp .env.example .env.production
nano .env.production
```

Set these for production:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://scheduler:<STRONG_PW>@db:5432/scheduler` — host **must be `db`** (the compose service name) |
| `POSTGRES_USER` | `scheduler` |
| `POSTGRES_PASSWORD` | the same `<STRONG_PW>` used in `DATABASE_URL` |
| `POSTGRES_DB` | `scheduler` |
| `DOMAIN` | `app.yourdomain.com` (used by Caddy for HTTPS) |
| `NEXTAUTH_SECRET` | output of `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://app.yourdomain.com` |
| `NEXT_PUBLIC_APP_URL` | `https://app.yourdomain.com` |
| `RESEND_API_KEY` | your Resend key |
| `EMAIL_FROM` | a sender on a domain verified in Resend |
| `CRON_SECRET` | output of `openssl rand -base64 32` (used by the reminders cron, step 7) |
| `CONTACT_EMAIL` | optional |
| `RECAPTCHA_*` | optional spam protection |

> `POSTGRES_USER/PASSWORD/DB` and `DOMAIN` are read by `docker-compose.prod.yml`;
> the rest are read by the app. Keeping them all in `.env.production` is fine.

## 5. Open the firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

(Postgres is **not** exposed to the internet — it's only reachable by the app
over Docker's internal network.)

## 6. Deploy

```bash
chmod +x deploy.sh docker-entrypoint.sh
./deploy.sh --seed      # first deploy: builds, starts, runs migrations, seeds admin user
```

On later updates, just run `./deploy.sh` (no `--seed`). Database migrations are
applied automatically every time the app container starts.

Check it's up:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```

Then visit `https://app.yourdomain.com`. Caddy issues the TLS certificate on
first request (give it a few seconds).

**Admin login:** the seed script creates the initial admin user — check
`prisma/seed.ts` for the email/password, and change the password after first login.

## 7. Schedule the daily reminder emails

On Vercel this was a cron job. Here, use the host crontab to hit the reminders
endpoint once a day (08:00 UTC, matching the original `vercel.json`):

```bash
crontab -e
```

Add (replace `<CRON_SECRET>` with the value from `.env.production`):

```cron
0 8 * * * curl -fsS -X POST https://app.yourdomain.com/api/cron/reminders \
  -H "Authorization: Bearer <CRON_SECRET>" >/dev/null 2>&1
```

The endpoint rejects requests without the correct `Authorization: Bearer` token.

## 8. Updating later

Push from your laptop, then on the server just run `deploy.sh` — it pulls the
latest commit, rebuilds, and restarts (migrations run automatically):

```bash
# laptop
git push origin main

# server
cd /opt/scheduler-app
./deploy.sh
```

`deploy.sh` runs `git pull` for you. Use `./deploy.sh --branch main` to force a
specific branch, or `./deploy.sh --no-pull` to deploy the checked-out code as-is.

---

## Backups (recommended)

Dump the database on a schedule and copy it off-box (e.g. to Vultr Object
Storage). Quick manual dump:

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U scheduler scheduler | gzip > backup-$(date +%F).sql.gz
```

## Troubleshooting

- **TLS cert not issued** — DNS A record must point to the server and ports
  80/443 must be open *before* the first request. Check `docker compose ... logs caddy`.
- **App can't reach the database** — confirm `DATABASE_URL` host is `db` and that
  `POSTGRES_PASSWORD` matches the password inside `DATABASE_URL`.
- **Build runs out of memory** — use a 2 GB+ instance, or add swap:
  `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`.
- **Migrations didn't apply** — they run in the app entrypoint; check
  `docker compose ... logs app` for the `prisma migrate deploy` output.
