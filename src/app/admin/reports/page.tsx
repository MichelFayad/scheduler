import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const thirtyDaysAgo = new Date(todayUTC);
  thirtyDaysAgo.setUTCDate(todayUTC.getUTCDate() - 30);
  const ninetyDaysAgo = new Date(todayUTC);
  ninetyDaysAgo.setUTCDate(todayUTC.getUTCDate() - 90);

  const [
    totalBookings,
    confirmedBookings,
    cancelledBookings,
    noShowBookings,
    completedBookings,
    last30Days,
    byCommunity,
    recentByDay,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "CANCELLED" } }),
    prisma.booking.count({ where: { status: "NO_SHOW" } }),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.booking.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.booking.groupBy({
      by: ["communityId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    // Last 14 days by scheduled date
    prisma.booking.groupBy({
      by: ["scheduledDate"],
      where: { scheduledDate: { gte: thirtyDaysAgo, lte: todayUTC } },
      _count: { id: true },
      orderBy: { scheduledDate: "asc" },
    }),
  ]);

  // Resolve community names
  const communityIds = byCommunity.map((b) => b.communityId);
  const communities = await prisma.community.findMany({
    where: { id: { in: communityIds } },
    select: { id: true, name: true },
  });
  const communityMap = Object.fromEntries(communities.map((c) => [c.id, c.name]));

  const cancellationRate = totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : "0";
  const noShowRate = totalBookings > 0 ? ((noShowBookings / totalBookings) * 100).toFixed(1) : "0";

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <a
          href="/admin/reports/export"
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Export CSV
        </a>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: "Total Bookings", value: totalBookings, color: "text-gray-900" },
          { label: "Confirmed", value: confirmedBookings, color: "text-green-600" },
          { label: "Completed", value: completedBookings, color: "text-gray-500" },
          { label: "Cancelled", value: cancelledBookings, color: "text-red-500" },
          { label: "No Shows", value: noShowBookings, color: "text-yellow-600" },
          { label: "Last 30 Days", value: last30Days, color: "text-blue-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By community */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-4">Bookings by Community</h2>
          {byCommunity.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {byCommunity.map((row) => {
                const pct = totalBookings > 0 ? (row._count.id / totalBookings) * 100 : 0;
                return (
                  <div key={row.communityId}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{communityMap[row.communityId] ?? row.communityId}</span>
                      <span className="font-semibold text-gray-900">{row._count.id}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rates + recent activity */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 text-sm mb-3">Rates</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Cancellation rate</p>
                <p className="text-2xl font-bold text-red-500">{cancellationRate}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">No-show rate</p>
                <p className="text-2xl font-bold text-yellow-500">{noShowRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 text-sm mb-3">Daily Volume (last 30 days)</h2>
            {recentByDay.length === 0 ? (
              <p className="text-sm text-gray-400">No scheduled inspections in this period.</p>
            ) : (
              <div className="space-y-1.5">
                {recentByDay.map((row) => {
                  const maxCount = Math.max(...recentByDay.map((r) => r._count.id));
                  const pct = maxCount > 0 ? (row._count.id / maxCount) * 100 : 0;
                  const dateLabel = new Date(row.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
                  return (
                    <div key={row.scheduledDate.toISOString()} className="flex items-center gap-3 text-xs">
                      <span className="w-14 text-gray-400 flex-shrink-0">{dateLabel}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full bg-blue-400 rounded" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-gray-600 w-4 text-right">{row._count.id}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
