#!/usr/bin/env bash
#
# Deploy / update the Scheduler app on a Vultr (or any Docker) host.
#
# Git-based workflow:
#   1. You push code to your git remote from your laptop.
#   2. On the server, this script pulls the latest commit, rebuilds, and restarts.
#
# First-time setup on the server (run once):
#   git clone https://github.com/MichelFayad/scheduler.git /opt/scheduler-app
#   cd /opt/scheduler-app
#   cp .env.example .env.production && nano .env.production   # fill in real values
#   ./deploy.sh --seed
#
# Subsequent deploys (after pushing new code):
#   cd /opt/scheduler-app && ./deploy.sh
#
# Options:
#   --seed       seed the database after starting (first deploy only)
#   --no-pull    skip the git pull (deploy whatever is checked out locally)
#   --branch X   pull/checkout branch X (default: current branch)
#
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.prod.yml"
SEED=false
PULL=true
BRANCH=""

while [ $# -gt 0 ]; do
  case "$1" in
    --seed) SEED=true ;;
    --no-pull) PULL=false ;;
    --branch) shift; BRANCH="$1" ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
  shift
done

# --- Preflight ---------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is not installed. See DEPLOY-VULTR.md step 2." >&2
  exit 1
fi

# --- Pull latest code --------------------------------------------------------
if [ "$PULL" = true ]; then
  if git rev-parse --git-dir >/dev/null 2>&1; then
    echo ">> Pulling latest code from git..."
    if [ -n "$BRANCH" ]; then
      git fetch origin "$BRANCH"
      git checkout "$BRANCH"
      git reset --hard "origin/$BRANCH"
    else
      git pull --ff-only
    fi
  else
    echo "WARNING: not a git checkout — skipping pull. Use --no-pull to silence." >&2
  fi
fi

if [ ! -f .env.production ]; then
  echo "ERROR: .env.production not found. Copy .env.example and fill it in:" >&2
  echo "       cp .env.example .env.production && nano .env.production" >&2
  exit 1
fi

# --- Build & start -----------------------------------------------------------
echo ">> Building images..."
$COMPOSE build

echo ">> Starting containers (db, app, caddy)..."
$COMPOSE up -d

# Migrations run automatically via the app container entrypoint
# (prisma migrate deploy). Wait for the app to report healthy-ish.
echo ">> Waiting for the app to come up..."
sleep 8
$COMPOSE ps

# --- Optional first-run seed -------------------------------------------------
if [ "$SEED" = true ]; then
  echo ">> Seeding the database (creates the initial admin user)..."
  $COMPOSE --profile seed run --rm seed
fi

echo ">> Done. Tail logs with:  $COMPOSE logs -f app"
