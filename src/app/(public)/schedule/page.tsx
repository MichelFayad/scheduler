"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadRecaptcha, getRecaptchaToken } from "@/lib/recaptcha-client";

interface Community {
  id: string;
  name: string;
  slug: string;
}

interface TimeSlot {
  time: string;
  available: number;
}

// Simple calendar component
function Calendar({
  year,
  month,
  availableDates,
  selected,
  onSelect,
  onMonthChange,
}: {
  year: number;
  month: number; // 1-12
  availableDates: string[];
  selected: string | null;
  onSelect: (d: string) => void;
  onMonthChange: (year: number, month: number) => void;
}) {
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-AU", {
    month: "long",
    year: "numeric",
  });

  const availableSet = new Set(availableDates);
  const today = new Date().toISOString().split("T")[0];

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function prevMonth() {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  }

  function nextMonth() {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 text-gray-600">
          ←
        </button>
        <span className="font-medium text-sm text-gray-800">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 text-gray-600">
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const ds = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isAvailable = availableSet.has(ds);
          const isSelected = selected === ds;
          const isPast = ds < today;

          return (
            <button
              key={ds}
              disabled={!isAvailable || isPast}
              onClick={() => onSelect(ds)}
              className={[
                "h-9 w-full rounded text-sm font-medium transition-colors",
                isSelected
                  ? "bg-blue-600 text-white"
                  : isAvailable && !isPast
                  ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "text-gray-300 cursor-not-allowed",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Form field wrapper
function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default function SchedulePage() {
  const router = useRouter();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState("");

  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loadingDates, setLoadingDates] = useState(false);

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    propertyAddress: "",
    inspectionDescription: "",
    notes: "",
    consent: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [honeypot, setHoneypot] = useState("");

  // Load communities on mount
  useEffect(() => {
    fetch("/api/communities")
      .then((r) => r.json())
      .then(setCommunities);
    loadRecaptcha();
  }, []);

  // Load available dates when community or month changes
  const loadDates = useCallback(async () => {
    if (!selectedCommunity) return;
    setLoadingDates(true);
    setSelectedDate(null);
    setSelectedTime(null);
    try {
      const r = await fetch(
        `/api/availability?communityId=${selectedCommunity}&year=${calYear}&month=${calMonth}`
      );
      setAvailableDates(await r.json());
    } finally {
      setLoadingDates(false);
    }
  }, [selectedCommunity, calYear, calMonth]);

  // Data-fetch-on-change: loadDates sets state only after its fetch resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadDates(); }, [loadDates]);

  // Load time slots when a date is selected. Resetting selection + showing the
  // loading state before the fetch is intentional, so suppress the effect rule.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedDate || !selectedCommunity) return;
    setSelectedTime(null);
    setLoadingSlots(true);
    fetch(`/api/availability?communityId=${selectedCommunity}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((slots: TimeSlot[]) => setTimeSlots(slots.filter((s) => s.available > 0)))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, selectedCommunity]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function validate() {
    const e: Record<string, string> = {};
    if (!selectedCommunity) e.community = "Please select a community";
    if (!selectedDate) e.date = "Please select a date";
    if (!selectedTime) e.time = "Please select a time slot";
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Valid email required";
    if (!form.propertyAddress.trim()) e.propertyAddress = "Required";
    if (!form.inspectionDescription.trim()) e.inspectionDescription = "Required";
    if (!form.consent) e.consent = "You must agree to proceed";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const recaptchaToken = await getRecaptchaToken("booking");
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId: selectedCommunity,
          scheduledDate: selectedDate,
          scheduledTime: selectedTime,
          website: honeypot,
          recaptchaToken,
          ...form,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push(`/confirmation?ref=${data.referenceNumber}`);
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="font-semibold text-lg tracking-tight text-gray-900">
            Scheduler
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Schedule an Inspection</h1>
        <p className="mt-1 text-sm text-gray-500">
          No account required. You&apos;ll receive a confirmation email with a management link.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
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

          {/* Community */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">Community</h2>
            <Field label="Select your community" required error={errors.community}>
              <select
                value={selectedCommunity}
                onChange={(e) => { setSelectedCommunity(e.target.value); setSelectedDate(null); }}
                className={inputClass}
              >
                <option value="">— Choose a community —</option>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </section>

          {/* Date & Time */}
          {selectedCommunity && (
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-800">Date &amp; Time</h2>
              {loadingDates ? (
                <p className="text-sm text-gray-400">Loading available dates…</p>
              ) : (
                <Calendar
                  year={calYear}
                  month={calMonth}
                  availableDates={availableDates}
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
                />
              )}
              {errors.date && <p className="text-xs text-red-600">{errors.date}</p>}

              {selectedDate && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Available times</p>
                  {loadingSlots ? (
                    <p className="text-sm text-gray-400">Loading…</p>
                  ) : timeSlots.length === 0 ? (
                    <p className="text-sm text-gray-400">No slots available on this date.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {timeSlots.map((s) => (
                        <button
                          type="button"
                          key={s.time}
                          onClick={() => setSelectedTime(s.time)}
                          className={[
                            "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                            selectedTime === s.time
                              ? "bg-blue-600 text-white border-blue-600"
                              : "border-gray-200 text-gray-700 hover:border-blue-400",
                          ].join(" ")}
                        >
                          {s.time}
                        </button>
                      ))}
                    </div>
                  )}
                  {errors.time && <p className="mt-1 text-xs text-red-600">{errors.time}</p>}
                </div>
              )}
            </section>
          )}

          {/* Personal details */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">Your Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="First name" required error={errors.firstName}>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Last name" required error={errors.lastName}>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Email address" required error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Phone number" error={errors.phone}>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Property address or unit / lot number" required error={errors.propertyAddress}>
              <input
                type="text"
                value={form.propertyAddress}
                onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })}
                className={inputClass}
              />
            </Field>
          </section>

          {/* Inspection details */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">Inspection Details</h2>
            <Field
              label="Describe the nature of your inspection"
              required
              error={errors.inspectionDescription}
            >
              <textarea
                rows={4}
                value={form.inspectionDescription}
                onChange={(e) => setForm({ ...form, inspectionDescription: e.target.value })}
                placeholder="e.g. Routine annual inspection, water damage assessment…"
                className={inputClass}
              />
            </Field>
            <Field label="Additional notes or special requests">
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={inputClass}
              />
            </Field>
          </section>

          {/* Consent + submit */}
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-600">
                I agree to the inspection terms and understand that my booking details will be
                shared with the community administrator.
              </span>
            </label>
            {errors.consent && <p className="text-xs text-red-600">{errors.consent}</p>}

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Submitting…" : "Confirm Booking"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
