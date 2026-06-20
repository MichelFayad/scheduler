"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

interface Community {
  id: string;
  name: string;
}
interface Slot {
  time: string;
  available: number;
  booked: number;
  max: number;
}

export default function NewBookingPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    communityId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    propertyAddress: "",
    inspectionDescription: "",
    notes: "",
    scheduledDate: "",
    scheduledTime: "",
    sendNotifications: true,
  });

  useEffect(() => {
    fetch("/api/admin/communities")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setCommunities(d))
      .catch(() => {});
  }, []);

  // Load availability for the chosen community + date as a guide (admin may
  // still book any time — this is advisory, not enforced).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!form.communityId || !form.scheduledDate) {
      setSlots([]);
      return;
    }
    fetch(`/api/availability?communityId=${form.communityId}&date=${form.scheduledDate}`)
      .then((r) => r.json())
      .then((d) => setSlots(Array.isArray(d) ? d : []))
      .catch(() => setSlots([]));
  }, [form.communityId, form.scheduledDate]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const chosenSlot = slots.find((s) => s.time === form.scheduledTime);
  const overbooked = !!chosenSlot && chosenSlot.available <= 0;
  const noRuleForDate = !!form.scheduledDate && !!form.communityId && slots.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to create booking");
        return;
      }
      const { bookingId } = await res.json();
      router.push(`/admin/bookings/${bookingId}`);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/bookings" className="text-sm text-gray-400 hover:text-gray-600">← Bookings</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">New Booking</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Community & Slot</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Community *</label>
            <select required value={form.communityId} onChange={(e) => setForm({ ...form, communityId: e.target.value, scheduledTime: "" })} className={inputClass}>
              <option value="">— Choose a community —</option>
              {communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" required value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value, scheduledTime: "" })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
              <input type="time" required value={form.scheduledTime} onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })} className={inputClass} />
            </div>
          </div>

          {slots.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Available slots this date (click to use)</p>
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button
                    type="button"
                    key={s.time}
                    onClick={() => setForm({ ...form, scheduledTime: s.time })}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      form.scheduledTime === s.time
                        ? "bg-blue-600 text-white border-blue-600"
                        : s.available > 0
                        ? "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
                        : "bg-red-50 border-red-200 text-red-600"
                    }`}
                  >
                    {s.time} {s.available > 0 ? `(${s.available} left)` : "(full)"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {overbooked && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              This slot is fully booked ({chosenSlot?.booked}/{chosenSlot?.max}). Creating this booking will overbook it.
            </p>
          )}
          {noRuleForDate && form.scheduledTime && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              No schedule rule covers this date — you are booking outside normal availability.
            </p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Customer Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name *</label>
              <input type="text" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name *</label>
              <input type="text" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} placeholder="optional" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property address or unit / lot number *</label>
            <input type="text" required value={form.propertyAddress} onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })} className={inputClass} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Inspection Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Describe the inspection *</label>
            <textarea required rows={3} value={form.inspectionDescription} onChange={(e) => setForm({ ...form, inspectionDescription: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / special requests</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} placeholder="optional" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.sendNotifications} onChange={(e) => setForm({ ...form, sendNotifications: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <span className="text-sm text-gray-700">Send confirmation email to customer and alert the community list</span>
          </label>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? "Creating…" : "Create Booking"}
          </button>
          <Link href="/admin/bookings" className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
