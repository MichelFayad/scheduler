import { prisma } from "@/lib/prisma";
import Link from "next/link";

async function getDashboardData() {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const weekEnd = new Date(todayUTC);
  weekEnd.setUTCDate(todayUTC.getUTCDate() + 7);

  const [todayBookings, weekBookings, totalActive, recentBookings, totalCommunities] =
    await Promise.all([
      prisma.booking.findMany({
        where: { scheduledDate: todayUTC, status: { in: ["CONFIRMED", "RESCHEDULED"] } },
        include: { community: { select: { name: true } } },
        orderBy: { scheduledTime: "asc" },
      }),
      prisma.booking.count({
        where: { scheduledDate: { gte: todayUTC, lt: weekEnd }, status: { in: ["CONFIRMED", "RESCHEDULED"] } },
      }),
      prisma.booking.count({
        where: { scheduledDate: { gte: todayUTC }, status: { in: ["CONFIRMED", "RESCHEDULED"] } },
      }),
      prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { community: { select: { name: true } } },
      }),
      prisma.community.count({ where: { isActive: true } }),
    ]);

  return { todayBookings, weekBookings, totalActive, recentBookings, totalCommunities };
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    CONFIRMED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    COMPLETED: "bg-gray-100 text-gray-600",
    NO_SHOW: "bg-yellow-100 text-yellow-700",
    RESCHEDULED: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ")}
    </span>
  );
}

export default async function DashboardPage() {
  const { todayBookings, weekBookings, totalActive, recentBookings, totalCommunities } =
    await getDashboardData();

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{todayLabel}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Today's Inspections", value: todayBookings.length, color: "text-blue-600" },
          { label: "This Week", value: weekBookings, color: "text-indigo-600" },
          { label: "Upcoming (total)", value: totalActive, color: "text-green-600" },
          { label: "Active Communities", value: totalCommunities, color: "text-gray-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm">Today&apos;s Inspections</h2>
            <Link href="/admin/bookings" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {todayBookings.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No inspections scheduled for today.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {todayBookings.map((b) => (
                <li key={b.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.firstName} {b.lastName}</p>
                    <p className="text-xs text-gray-500">{b.community.name} - {b.propertyAddress}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 ml-4">{b.scheduledTime}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm">Recent Bookings</h2>
            <Link href="/admin/bookings" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {recentBookings.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No bookings yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentBookings.map((b) => (
                <li key={b.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{b.firstName} {b.lastName}</p>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {b.community.name} - {new Date(b.scheduledDate).toLocaleDateString("en-US", { timeZone: "UTC" })} at {b.scheduledTime}
                      </p>
                    </div>
                    <span className="ml-3 text-xs font-mono text-gray-400 flex-shrink-0">{b.referenceNumber}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
