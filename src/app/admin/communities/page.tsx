import { prisma } from "@/lib/prisma";
import Link from "next/link";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CommunitiesPage() {
  const communities = await prisma.community.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { bookings: true } },
      alertEmails: { where: { isActive: true }, select: { email: true } },
      scheduleRules: { where: { isActive: true }, orderBy: { dayOfWeek: "asc" } },
    },
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Communities</h1>
        <Link
          href="/admin/communities/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Community
        </Link>
      </div>

      <div className="space-y-4">
        {communities.map((c) => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">{c.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {c.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">/{c.slug}</p>
              </div>
              <Link
                href={`/admin/communities/${c.id}`}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                Edit
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Total Bookings</p>
                <p className="font-semibold text-gray-800">{c._count.bookings}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Alert Emails</p>
                <p className="font-semibold text-gray-800">{c.alertEmails.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Self-service Window</p>
                <p className="font-semibold text-gray-800">{c.selfServiceWindowHours}h before</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Booking Window</p>
                <p className="font-semibold text-gray-800">{c.minAdvanceBookingHours}h–{c.maxFutureDays}d</p>
              </div>
            </div>

            {c.scheduleRules.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {c.scheduleRules.map((r) => (
                  <span key={r.id} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-600">
                    {DAYS[r.dayOfWeek]} {r.startTime}–{r.endTime} · {r.slotDurationMins}min · max {r.maxPerSlot ?? c.defaultMaxPerSlot}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {communities.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-16">No communities yet. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}
