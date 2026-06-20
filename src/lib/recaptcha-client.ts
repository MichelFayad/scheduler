"use client";

// Thin client-side helper for Google reCAPTCHA v3.
// All functions no-op gracefully when NEXT_PUBLIC_RECAPTCHA_SITE_KEY is unset,
// so the forms work without keys (server still enforces honeypot + rate limit).
const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

type Grecaptcha = {
  ready: (cb: () => void) => void;
  execute: (key: string, opts: { action: string }) => Promise<string>;
};

function grecaptcha(): Grecaptcha | undefined {
  return (window as unknown as { grecaptcha?: Grecaptcha }).grecaptcha;
}

/** Inject the reCAPTCHA v3 script once, if a site key is configured. */
export function loadRecaptcha(): void {
  if (!SITE_KEY || typeof document === "undefined") return;
  if (document.getElementById("recaptcha-v3")) return;
  const s = document.createElement("script");
  s.id = "recaptcha-v3";
  s.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
  s.async = true;
  document.head.appendChild(s);
}

/** Resolve a reCAPTCHA token for an action, or undefined if not configured. */
export function getRecaptchaToken(action: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const g = grecaptcha();
    if (!SITE_KEY || !g) return resolve(undefined);
    g.ready(() => {
      g.execute(SITE_KEY, { action })
        .then(resolve)
        .catch(() => resolve(undefined));
    });
  });
}
