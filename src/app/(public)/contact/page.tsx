"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadRecaptcha, getRecaptchaToken } from "@/lib/recaptcha-client";

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    loadRecaptcha();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) || !form.message.trim()) {
      setError("Please fill in your name, a valid email, and a message.");
      return;
    }

    setSubmitting(true);
    try {
      const recaptchaToken = await getRecaptchaToken("contact");
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, website: honeypot, recaptchaToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="font-semibold text-lg tracking-tight text-gray-900">
            Scheduler
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Contact &amp; Help</h1>
        <p className="mt-1 text-sm text-gray-500">
          Need assistance with a booking? Send us a message and we&apos;ll get back to you.
        </p>

        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          <div className="sm:col-span-1 space-y-4 text-sm">
            <div>
              <p className="font-semibold text-gray-800">Email</p>
              <p className="text-gray-500">support@yourdomain.com</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Hours</p>
              <p className="text-gray-500">Mon–Fri, 9am–5pm</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Manage a booking</p>
              <p className="text-gray-500">
                Use the secure link in your confirmation email to cancel or reschedule.
              </p>
            </div>
          </div>

          <div className="sm:col-span-2">
            {sent ? (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-6 text-sm text-green-800">
                <p className="font-medium">Thanks — your message has been sent.</p>
                <p className="mt-1">We&apos;ll respond to you by email as soon as we can.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className={inputClass}
                  />
                </div>

                {/* Honeypot — hidden from real users */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="hidden"
                />

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
        <span className="mx-2">·</span>
        <Link href="/terms" className="hover:text-gray-600">Terms</Link>
      </footer>
    </div>
  );
}
