// Server-side Google reCAPTCHA v3 verification.
//
// No-ops (returns true) when RECAPTCHA_SECRET_KEY is unset, so local/dev works
// without keys. The honeypot field and per-IP rate limiting remain active
// regardless, so public forms are never left fully unprotected.
export async function verifyRecaptcha(
  token: string | undefined,
  remoteIp?: string
): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true; // not configured → skip (honeypot + rate limit still apply)
  if (!token) return false;

  const minScore = Number(process.env.RECAPTCHA_MIN_SCORE ?? "0.5");

  try {
    const params = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== "unknown") params.set("remoteip", remoteIp);

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = (await res.json()) as { success: boolean; score?: number };
    if (!data.success) return false;
    if (typeof data.score === "number") return data.score >= minScore;
    return true;
  } catch {
    return false;
  }
}
