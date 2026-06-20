"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  NO_SHOW: "bg-yellow-100 text-yellow-700",
  RESCHEDULED: "bg-blue-100 text-blue-700",
};

interface Booking {
  id: string;
  referenceNumber: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  propertyAddress: string;
  inspectionDescription: string;
  notes: string | null;
  scheduledDate: string;
  scheduledTime: string;
  cancellationReason: string | null;
  createdAt: string;
  community: { id: string; name: string };
  emailLogs: { id: string; trigger: string; recipient: string; subject: string; sentAt: string; isError: boolean }[];
}

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    propertyAddress: "", inspectionDescription: "", notes: "",
  });

  useEffect(() => {
    fetch(`/api/admin/bookings/${id}`).then(async (r) => {
      if (!r.ok) {
        setNotFound(true);
        return;
      }
      setBooking(await r.json());
    });
  }, [id]);

  function startEdit() {
    if (!booking) return;
    setEditForm({
      firstName: booking.firstName,
      lastName: booking.lastName,
      email: booking.email,
      phone: booking.phone ?? "",
      propertyAddress: booking.propertyAddress,
      inspectionDescription: booking.inspectionDescription,
      notes: booking.notes ?? "",
    });
    setEditError("");
    setEditing(true);
  }

  async function saveDetails() {
    setSavingEdit(true);
    setEditError("");
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_details", ...editForm }),
    });
    if (res.ok) {
      const updated = await res.json();
      setBooking({ ...booking!, ...updated });
      setEditing(false);
    } else {
      const d = await res.json().catch(() => ({}));
      setEditError(d.error ?? "Failed to save details");
    }
    setSavingEdit(false);
  }

  async function performAction() {
    setLoading(true);
    setError("");
    const body =
      action === "cancel" ? { action: "cancel", reason } :
      action === "reschedule" ? { action: "reschedule", scheduledDate: newDate, scheduledTime: newTime } :
      { action };

    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated = await res.json();
      setBooking({ ...booking!, ...updated });
      setAction("");
    } else {
      const d = await res.json();
      setError(d.error ?? "Action failed");
    }
    setLoading(false);
  }

  if (notFound) {
    return (
      <div className="p-8 max-w-3xl">
        <Link href="/admin/bookings" className="text-sm text-gray-400 hover:text-gray-600">Back to Bookings</Link>
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-8 text-center">
          <h1 className="text-lg font-semibold text-gray-800">Booking not found</h1>
          <p className="mt-1 text-sm text-gray-500">This booking may have been deleted, or the link is no longer valid.</p>
        </div>
      </div>
    );
  }

  if (!booking) return <div className="p-8 text-sm text-gray-400">Loading...</div>;

  const dateLabel = new Date(booking.scheduledDate).toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  const canAct = ["CONFIRMED", "RESCHEDULED"].includes(booking.status);
  const editInput = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/bookings" className="text-sm text-gray-400 hover:text-gray-600">Back to Bookings</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900 font-mono">{booking.referenceNumber}</h1>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[booking.status] ?? "bg-gray-100 text-gray-600"}`}>
            {booking.status.charAt(0) + booking.status.slice(1).toLowerCase().replace("_", " ")}
          </span>
        </div>
        {!editing && (
          <button onClick={startEdit} className="px-3 py-1.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
            Edit details
          </button>
        )}
      </div>

      {editing ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm">Edit Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">First name</label>
              <input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className={editInput} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Last name</label>
              <input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className={editInput} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={editInput} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone</label>
              <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className={editInput} placeholder="optional" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Property address or unit / lot number</label>
            <input value={editForm.propertyAddress} onChange={(e) => setEditForm({ ...editForm, propertyAddress: e.target.value })} className={editInput} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Inspection description</label>
            <textarea rows={3} value={editForm.inspectionDescription} onChange={(e) => setEditForm({ ...editForm, inspectionDescription: e.target.value })} className={editInput} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className={editInput} placeholder="optional" />
          </div>
          {editError && <p className="text-xs text-red-600">{editError}</p>}
          <div className="flex gap-2">
            <button onClick={saveDetails} disabled={savingEdit} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {savingEdit ? "Saving…" : "Save details"}
            </button>
            <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">Booking Details</h2>
          {[
            { label: "Community", value: booking.community.name },
            { label: "Date", value: dateLabel },
            { label: "Time", value: booking.scheduledTime },
            { label: "Property", value: booking.propertyAddress },
            { label: "Inspection", value: booking.inspectionDescription },
            { label: "Notes", value: booking.notes ?? "-" },
            { label: "Booked on", value: new Date(booking.createdAt).toLocaleString("en-AU") },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm text-gray-800">{value}</p>
            </div>
          ))}
          {booking.cancellationReason && (
            <div>
              <p className="text-xs text-gray-400">Cancellation reason</p>
              <p className="text-sm text-red-700">{booking.cancellationReason}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Contact</h2>
            {[
              { label: "Name", value: `${booking.firstName} ${booking.lastName}` },
              { label: "Email", value: booking.email },
              { label: "Phone", value: booking.phone ?? "-" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm text-gray-800">{value}</p>
              </div>
            ))}
          </div>

          {canAct && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-semibold text-gray-800 text-sm mb-3">Actions</h2>
              {!action ? (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setAction("cancel")} className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">Cancel booking</button>
                  <button onClick={() => setAction("reschedule")} className="px-3 py-1.5 text-sm border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">Reschedule</button>
                  <button onClick={() => setAction("no_show")} className="px-3 py-1.5 text-sm border border-yellow-200 text-yellow-600 rounded-lg hover:bg-yellow-50 transition-colors">Mark no-show</button>
                  <button onClick={() => setAction("complete")} className="px-3 py-1.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">Mark complete</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {action === "cancel" && (
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancellation (optional)" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                  {action === "reschedule" && (
                    <div className="flex gap-2">
                      <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}
                  {(action === "no_show" || action === "complete") && (
                    <p className="text-sm text-gray-600">Mark this booking as <strong>{action === "no_show" ? "no-show" : "completed"}?</strong></p>
                  )}
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <div className="flex gap-2">
                    <button onClick={performAction} disabled={loading} className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
                      {loading ? "Processing..." : "Confirm"}
                    </button>
                    <button onClick={() => { setAction(""); setError(""); }} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {booking.emailLogs.length > 0 && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">Email Log</h2>
          <ul className="space-y-1">
            {booking.emailLogs.map((log) => (
              <li key={log.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                <div>
                  <span className={`font-medium ${log.isError ? "text-red-600" : "text-gray-700"}`}>{log.trigger.replace(/_/g, " ")}</span>
                  <span className="text-gray-400 ml-2">to {log.recipient}</span>
                </div>
                <span className="text-gray-400">{new Date(log.sentAt).toLocaleString("en-AU")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
