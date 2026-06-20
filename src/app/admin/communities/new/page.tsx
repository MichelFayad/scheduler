"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function NewCommunityPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    selfServiceWindowHours: 24,
    minAdvanceBookingHours: 24,
    maxFutureDays: 60,
    defaultMaxPerSlot: 1,
    reminderEnabled: false,
    reminderHoursBefore: 24,
    senderName: "Scheduler",
    replyToEmail: "",
  });

  function handleNameChange(name: string) {
    setForm({
      ...form,
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create community");
        return;
      }
      const community = await res.json();
      router.push(`/admin/communities/${community.id}`);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/communities" className="text-sm text-gray-400 hover:text-gray-600">← Communities</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">New Community</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Basic Info</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Community Name *</label>
            <input type="text" value={form.name} onChange={(e) => handleNameChange(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required className={inputClass} />
            <p className="text-xs text-gray-400 mt-1">Used in URLs and emails. Lowercase, hyphens only.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name</label>
            <input type="text" value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reply-to Email</label>
            <input type="email" value={form.replyToEmail} onChange={(e) => setForm({ ...form, replyToEmail: e.target.value })} className={inputClass} placeholder="optional" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Booking Windows</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min advance (hours)</label>
              <input type="number" min={0} value={form.minAdvanceBookingHours} onChange={(e) => setForm({ ...form, minAdvanceBookingHours: +e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max future (days)</label>
              <input type="number" min={1} value={form.maxFutureDays} onChange={(e) => setForm({ ...form, maxFutureDays: +e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Self-service window (hours)</label>
              <input type="number" min={0} value={form.selfServiceWindowHours} onChange={(e) => setForm({ ...form, selfServiceWindowHours: +e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default max bookings per slot</label>
              <input type="number" min={1} value={form.defaultMaxPerSlot} onChange={(e) => setForm({ ...form, defaultMaxPerSlot: Math.max(1, +e.target.value) })} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Reminder</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.reminderEnabled} onChange={(e) => setForm({ ...form, reminderEnabled: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <span className="text-sm text-gray-700">Send reminder email to users before inspection</span>
          </label>
          {form.reminderEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hours before inspection</label>
              <input type="number" min={1} value={form.reminderHoursBefore} onChange={(e) => setForm({ ...form, reminderHoursBefore: +e.target.value })} className={inputClass} />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? "Creating…" : "Create Community"}
          </button>
          <Link href="/admin/communities" className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
