"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

interface ScheduleRule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMins: number;
  maxPerSlot: number | null; // null = inherit community default
}

interface AlertEmail {
  id: string;
  email: string;
  isActive: boolean;
}

interface DateOverride {
  id: string;
  date: string;
  isBlocked: boolean;
  note: string | null;
}

interface Community {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  selfServiceWindowHours: number;
  minAdvanceBookingHours: number;
  maxFutureDays: number;
  defaultMaxPerSlot: number;
  reminderEnabled: boolean;
  reminderHoursBefore: number;
  senderName: string;
  replyToEmail: string | null;
}

export default function EditCommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [community, setCommunity] = useState<Community | null>(null);
  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [alertEmails, setAlertEmails] = useState<AlertEmail[]>([]);
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRule, setNewRule] = useState<{ dayOfWeek: number; startTime: string; endTime: string; slotDurationMins: number; maxPerSlot: number | null }>({ dayOfWeek: 1, startTime: "09:00", endTime: "16:00", slotDurationMins: 60, maxPerSlot: null });
  const [newOverride, setNewOverride] = useState({ date: "", isBlocked: true, note: "" });

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/communities/${id}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/admin/communities/${id}/schedule-rules`).then((r) => r.json()).catch(() => []),
      fetch(`/api/admin/communities/${id}/alert-emails`).then((r) => r.json()).catch(() => []),
      fetch(`/api/admin/communities/${id}/date-overrides`).then((r) => r.json()).catch(() => []),
    ]).then(([c, r, a, o]) => {
      setCommunity(c);
      setRules(r);
      setAlertEmails(a.filter((e: AlertEmail) => e.isActive));
      setOverrides(Array.isArray(o) ? o : []);
    });
  }, [id]);

  async function saveCommunity(e: React.FormEvent) {
    e.preventDefault();
    if (!community) return;
    setSaving(true);
    setSaveMsg("");
    const res = await fetch(`/api/admin/communities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(community),
    });
    setSaving(false);
    setSaveMsg(res.ok ? "Saved!" : "Failed to save.");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  async function addEmail() {
    if (!newEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return;
    const res = await fetch(`/api/admin/communities/${id}/alert-emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail }),
    });
    if (res.ok) {
      const record = await res.json();
      setAlertEmails([...alertEmails, record]);
      setNewEmail("");
    }
  }

  async function removeEmail(email: string) {
    await fetch(`/api/admin/communities/${id}/alert-emails`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setAlertEmails(alertEmails.filter((a) => a.email !== email));
  }

  async function addOverride() {
    if (!newOverride.date) return;
    const res = await fetch(`/api/admin/communities/${id}/date-overrides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOverride),
    });
    if (res.ok) {
      const record = await res.json();
      setOverrides(
        [...overrides.filter((o) => o.date.slice(0, 10) !== newOverride.date), record].sort((a, b) =>
          a.date.localeCompare(b.date)
        )
      );
      setNewOverride({ date: "", isBlocked: true, note: "" });
    }
  }

  async function removeOverride(date: string) {
    await fetch(`/api/admin/communities/${id}/date-overrides`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    setOverrides(overrides.filter((o) => o.date.slice(0, 10) !== date));
  }

  async function addRule() {
    const res = await fetch(`/api/admin/communities/${id}/schedule-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRule),
    });
    if (res.ok) {
      const rule = await res.json();
      setRules([...rules, rule]);
    }
  }

  async function deleteRule(ruleId: string) {
    await fetch(`/api/admin/communities/${id}/schedule-rules`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleId }),
    });
    setRules(rules.filter((r) => r.id !== ruleId));
  }

  if (!community) return <div className="p-8 text-sm text-gray-400">Loading...</div>;

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/communities" className="text-sm text-gray-400 hover:text-gray-600">Back to Communities</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{community.name}</h1>
      </div>

      <form onSubmit={saveCommunity} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">General Settings</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={community.isActive} onChange={(e) => setCommunity({ ...community, isActive: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={community.name} onChange={(e) => setCommunity({ ...community, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input type="text" value={community.slug} onChange={(e) => setCommunity({ ...community, slug: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name</label>
              <input type="text" value={community.senderName} onChange={(e) => setCommunity({ ...community, senderName: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reply-to Email</label>
              <input type="email" value={community.replyToEmail ?? ""} onChange={(e) => setCommunity({ ...community, replyToEmail: e.target.value })} className={inputClass} placeholder="optional" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Booking Windows</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min advance (hours)</label>
              <input type="number" min={0} value={community.minAdvanceBookingHours} onChange={(e) => setCommunity({ ...community, minAdvanceBookingHours: +e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max future (days)</label>
              <input type="number" min={1} value={community.maxFutureDays} onChange={(e) => setCommunity({ ...community, maxFutureDays: +e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Self-service window (hours)</label>
              <input type="number" min={0} value={community.selfServiceWindowHours} onChange={(e) => setCommunity({ ...community, selfServiceWindowHours: +e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default max bookings per slot</label>
              <input type="number" min={1} value={community.defaultMaxPerSlot} onChange={(e) => setCommunity({ ...community, defaultMaxPerSlot: Math.max(1, +e.target.value) })} className={inputClass} />
              <p className="text-xs text-gray-400 mt-1">Applied to every slot unless a schedule rule or date override sets its own.</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Reminder Email</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={community.reminderEnabled} onChange={(e) => setCommunity({ ...community, reminderEnabled: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <span className="text-sm text-gray-700">Send reminder email to users</span>
          </label>
          {community.reminderEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hours before inspection</label>
              <input type="number" min={1} value={community.reminderHoursBefore} onChange={(e) => setCommunity({ ...community, reminderHoursBefore: +e.target.value })} className={inputClass} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saveMsg && <span className={`text-sm font-medium ${saveMsg === "Saved!" ? "text-green-600" : "text-red-600"}`}>{saveMsg}</span>}
        </div>
      </form>

      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Schedule Rules</h2>
        {rules.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No schedule rules yet.</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {rules.map((r) => (
              <li key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-700">
                  <strong>{DAYS[r.dayOfWeek]}</strong> {r.startTime}-{r.endTime} - {r.slotDurationMins} min slots - max {r.maxPerSlot ?? `${community.defaultMaxPerSlot} (default)`} per slot
                </span>
                <button onClick={() => deleteRule(r.id)} className="text-red-400 hover:text-red-600 text-xs ml-4">Remove</button>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Add rule</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <select value={newRule.dayOfWeek} onChange={(e) => setNewRule({ ...newRule, dayOfWeek: +e.target.value })} className={inputClass}>
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
            <input type="time" value={newRule.startTime} onChange={(e) => setNewRule({ ...newRule, startTime: e.target.value })} className={inputClass} />
            <input type="time" value={newRule.endTime} onChange={(e) => setNewRule({ ...newRule, endTime: e.target.value })} className={inputClass} />
            <input type="number" min={15} value={newRule.slotDurationMins} onChange={(e) => setNewRule({ ...newRule, slotDurationMins: +e.target.value })} placeholder="Duration (min)" className={inputClass} />
            <input type="number" min={1} value={newRule.maxPerSlot ?? ""} onChange={(e) => setNewRule({ ...newRule, maxPerSlot: e.target.value === "" ? null : +e.target.value })} placeholder={`Max/slot (default ${community.defaultMaxPerSlot})`} className={inputClass} />
          </div>
          <button onClick={addRule} className="mt-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors">
            Add Rule
          </button>
        </div>
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-800 mb-1">Date Overrides</h2>
        <p className="text-xs text-gray-400 mb-4">Block specific dates. Blocked dates show no available slots to the public.</p>
        {overrides.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No overrides set.</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {overrides.map((o) => {
              const dateLabel = new Date(o.date).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
              return (
                <li key={o.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-700">
                    <strong>{dateLabel}</strong>
                    {o.isBlocked && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Blocked</span>}
                    {o.note && <span className="ml-2 text-gray-400"> - {o.note}</span>}
                  </span>
                  <button onClick={() => removeOverride(o.date.slice(0, 10))} className="text-red-400 hover:text-red-600 text-xs ml-4">Remove</button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Add override</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input type="date" value={newOverride.date} onChange={(e) => setNewOverride({ ...newOverride, date: e.target.value })} className={inputClass} />
            <input type="text" value={newOverride.note} onChange={(e) => setNewOverride({ ...newOverride, note: e.target.value })} placeholder="Note (optional)" className={inputClass} />
            <label className="flex items-center gap-2 px-3">
              <input type="checkbox" checked={newOverride.isBlocked} onChange={(e) => setNewOverride({ ...newOverride, isBlocked: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-red-500" />
              <span className="text-sm text-gray-700">Block this date</span>
            </label>
          </div>
          <button onClick={addOverride} className="mt-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors">
            Add Override
          </button>
        </div>
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Alert Distribution List</h2>
        {alertEmails.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No alert emails configured.</p>
        ) : (
          <ul className="space-y-1 mb-4">
            {alertEmails.map((a) => (
              <li key={a.id ?? a.email} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-700">{a.email}</span>
                <button onClick={() => removeEmail(a.email)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())} placeholder="email@example.com" className={`${inputClass} flex-1`} />
          <button onClick={addEmail} className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap">Add Email</button>
        </div>
      </div>
    </div>
  );
}
