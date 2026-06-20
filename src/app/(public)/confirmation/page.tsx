import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function ConfirmationContent({ bookingRef }: { bookingRef: string }) {
  const referenceNumber = bookingRef;
  const booking = await prisma.booking.findUnique({
    where: { referenceNumber },
    include: { community: { select: { name: true } } },
  });

  if (!booking) {
    return (
      <div className="text-center">
        <p className="text-gray-500">Booking not found.</p>
        <Link href="/schedule" className="mt-4 inline-block text-blue-600 hover:underline text-sm">
          Make a new booking
        </Link>
      </div>
    );
  }

  const dateLabel = new Date(booking.scheduledDate).toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="max-w-lg mx-auto">
      {/* Success banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-green-900">Booking Confirmed</h1>
        <p className="mt-1 text-sm text-green-700">
          A confirmation email has been sent to <strong>{booking.email}</strong>
        </p>
      </div>

      {/* Booking details */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">Booking reference</span>
          <span className="font-mono font-bold text-gray-900">{booking.referenceNumber}</span>
        </div>
        <dl className="divide-y divide-gray-100">
          {[
            { label: "Community", value: booking.community.name },
            { label: "Name", value: `${booking.firstName} ${booking.lastName}` },
            { label: "Property", value: booking.propertyAddress },
            { label: "Date", value: dateLabel },
            { label: "Time", value: booking.scheduledTime },
            { label: "Inspection", value: booking.inspectionDescription },
          ].map(({ label, value }) => (
            <div key={label} className="px-6 py-3 flex gap-4">
              <dt className="w-28 flex-shrink-0 text-sm text-gray-500">{label}</dt>
              <dd className="text-sm text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <strong>Need to change your booking?</strong> Use the link in your confirmation email to
        cancel or reschedule — no login required.
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="font-semibold text-lg tracking-tight text-gray-900">
            Scheduler
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">
        <Suspense fallback={<p className="text-center text-gray-400">Loading…</p>}>
          <ConfirmationContent bookingRef={ref ?? ""} />
        </Suspense>
      </main>
    </div>
  );
}
