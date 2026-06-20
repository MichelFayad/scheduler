"use client";

import { useState, useEffect, use } from "react";

interface BookingDetail {
  id: string;
  referenceNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  inspectionType: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  selfServiceWindowExpired: boolean;
  community: { name: string };
}

interface Slot { time: string; available: number; booked: number; max: number }

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
};

export default function ManageBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cancel flow
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Reschedule flow
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [newTime, setNewTime] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const [actionResult, setActionResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetch(`/api/manage/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setBooking(d);
      })
      .catch(() => setError("Failed to load booking"))
      .finally(() => setLoading(false));
  }, [token]);

  // Reset + show loading before fetching slots for the newly chosen date.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!newDate || !booking) return;
    setSlotsLoading(true);
    setNewTime("");
    fetch(`/api/manage/${token}/slots?date=${newDate}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setSlots(d); })
      .catch(() => {})
      .finally(() => setSlotsLoading(false));
  }, [newDate, token, booking]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleCancel() {
    setCancelling(true);
    const res = await fetch(`/api/manage/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", reason: cancelReason }),
    });
    const d = await res.json();
    setCancelling(false);
    if (res.ok) {
      setActionResult({ type: "success", message: "Your booking has been cancelled. A confirmation email has been sent." });
      setBooking((b) => b ? { ...b, status: "CANCELLED" } : b);
      setShowCancel(false);
    } else {
      setActionResult({ type: "error", message: d.error ?? "Failed to cancel booking." });
    }
  }

  async function handleReschedule() {
    if (!newDate || !newTime) return;
    setRescheduling(true);
    const res = await fetch(`/api/manage/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reschedule", newDate, newTime }),
    });
    const d = await res.json();
    setRescheduling(false);
    if (res.ok) {
      setActionResult({ type: "success", message: "Your booking has been rescheduled. A confirmation email has been sent." });
      setBooking((b) => b ? { ...b, scheduledDate: newDate, scheduledTime: newTime, status: "RESCHEDULED" } : b);
      setShowReschedule(false);
    } else {
      setActionResult({ type: "error", message: d.error ?? "Failed to reschedule booking." });
    }
  }

  const formatDate = (ds: string) => new Date(ds).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-xl">!</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Booking Not Found</h1>
          <p className="text-sm text-gray-500">{error || "This link may be invalid or expired."}</p>
        </div>
      </div>
    );
  }

  const canAct = !booking.selfServiceWindowExpired && ["CONFIRMED", "RESCHEDULED"].includes(booking.status);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Manage Your Booking</h1>
          <p className="text-sm text-gray-500 mt-1">{booking.community.name}</p>
        </div>

        {actionResult && (
          <div className={`mb-4 p-4 rounded-xl text-sm font-medium ${actionResult.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {actionResult.message}
          </div>
        )}

        {/* Booking details card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 font-medium">Reference</p>
              <p className="text-base font-bold text-gray-900">{booking.referenceNumber}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
              booking.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
              booking.status === "CANCELLED" ? "bg-red-100 text-red-600" :
              booking.status === "RESCHEDULED" ? "bg-blue-100 text-blue-700" :
              "bg-gray-100 text-gray-500"
            }`}>
              {STATUS_LABELS[booking.status] ?? booking.status}
            </span>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Name</dt>
              <dd className="font-medium text-gray-800">{booking.firstName} {booking.lastName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-800">{booking.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Address</dt>
              <dd className="font-medium text-gray-800">{booking.address}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Inspection type</dt>
              <dd className="font-medium text-gray-800 whitespace-pre-wrap">{booking.inspectionType}</dd>
            </div>
            <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between">
              <dt className="text-gray-500">Date</dt>
              <dd className="font-semibold text-gray-900">{formatDate(booking.scheduledDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Time</dt>
              <dd className="font-semibold text-gray-900">{booking.scheduledTime}</dd>
            </div>
          </dl>
        </div>

        {/* Actions */}
        {canAct && !actionResult && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm mb-3">Manage Booking</h2>

            {!showCancel && !showReschedule && (
              <div className="flex gap-3">
                <button onClick={() => setShowReschedule(true)}
                  className="flex-1 py-2 border border-blue-600 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors">
                  Reschedule
                </button>
                <button onClick={() => setShowCancel(true)}
                  className="flex-1 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors">
                  Cancel Booking
                </button>
              </div>
            )}

            {/* Cancel form */}
            {showCancel && (
              <div>
                <p className="text-sm text-gray-600 mb-3">Are you sure you want to cancel this inspection?</p>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reason (optional)</label>
                  <textarea rows={2} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Let us know why you're cancelling…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCancel} disabled={cancelling}
                    className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                    {cancelling ? "Cancelling…" : "Yes, Cancel Booking"}
                  </button>
                  <button onClick={() => setShowCancel(false)}
                    className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                    Keep Booking
                  </button>
                </div>
              </div>
            )}

            {/* Reschedule form */}
            {showReschedule && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">New Date</label>
                  <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {newDate && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">New Time</label>
                    {slotsLoading ? (
                      <p className="text-xs text-gray-400">Loading slots…</p>
                    ) : slots.every((s) => s.available <= 0) ? (
                      <p className="text-xs text-gray-400">No available slots on this date.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5">
                        {slots.map((s) => (
                          <button key={s.time}
                            disabled={s.available <= 0}
                            onClick={() => setNewTime(s.time)}
                            className={`py-1.5 text-xs rounded-lg border transition-colors ${
                              newTime === s.time
                                ? "bg-blue-600 text-white border-blue-600"
                                : s.available > 0
                                ? "border-gray-300 hover:border-blue-400 text-gray-700"
                                : "border-gray-100 text-gray-300 cursor-not-allowed"
                            }`}>
                            {s.time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={handleReschedule} disabled={!newDate || !newTime || rescheduling}
                    className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {rescheduling ? "Rescheduling…" : "Confirm Reschedule"}
                  </button>
                  <button onClick={() => { setShowReschedule(false); setNewDate(""); setNewTime(""); }}
                    className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {booking.selfServiceWindowExpired && ["CONFIRMED", "RESCHEDULED"].includes(booking.status) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            The self-service window for this booking has closed. To make changes, please contact us directly.
          </div>
        )}
      </div>
    </div>
  );
}
