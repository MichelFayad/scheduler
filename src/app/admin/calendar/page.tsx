import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CommunityFilter from "@/components/admin/CommunityFilter";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-600",
  COMPLETED: "bg-gray-100 text-gray-500",
  NO_SHOW: "bg-yellow-100 text-yellow-700",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; community?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.year ?? now.getFullYear());
  const month = Number(sp.month ?? now.getMonth() + 1);
  const communityId = sp.community ?? "";

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const lastOfMonth = new Date(Date.UTC(year, month, 0));
  const firstDay = firstOfMonth.getUTCDay();
  const daysInMonth = lastOfMonth.getUTCDate();

  const [bookings, communities] = await Promise.all([
    prisma.booking.findMany({
      where: {
        scheduledDate: { gte: firstOfMonth, lte: lastOfMonth },
        status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] },
        ...(communityId ? { communityId } : {}),
      },
      include: { community: { select: { name: true } } },
      orderBy: { scheduledTime: "asc" },
    }),
    prisma.community.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  // Group by date string
  const byDate: Record<string, typeof bookings> = {};
  for (const b of bookings) {
    const ds = new Date(b.scheduledDate).toISOString().split("T")[0];
    if (!byDate[ds]) byDate[ds] = [];
    byDate[ds].push(b);
  }

  const monthLabel = firstOfMonth.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  function nav(dy: number) {
    let m = month + dy;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    const params = new URLSearchParams({ year: String(y), month: String(m), ...(communityId ? { community: communityId } : {}) });
    return `/admin/calendar?${params}`;
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayStr = now.toISOString().split("T")[0];

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
        <div className="flex items-center gap-3">
          <CommunityFilter
            communities={communities}
            year={year}
            month={month}
            communityId={communityId}
          />
          <div className="flex items-center gap-1">
            <Link href={nav(-1)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">←</Link>
            <span className="px-4 text-sm font-medium text-slate-700 whitespace-nowrap">{monthLabel}</span>
            <Link href={nav(1)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">→</Link>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="min-h-[100px] border-r border-b border-gray-50" />;
            const ds = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayBookings = byDate[ds] ?? [];
            const isToday = ds === todayStr;
            return (
              <div key={ds} className={`min-h-[100px] border-r border-b border-gray-50 p-1.5 ${isToday ? "bg-blue-50" : ""}`}>
                <p className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-blue-600 text-white" : "text-gray-500"}`}>{day}</p>
                <div className="space-y-0.5">
                  {dayBookings.slice(0, 3).map((b) => (
                    <Link key={b.id} href={`/admin/bookings/${b.id}`}
                      className={`block text-xs px-1.5 py-0.5 rounded truncate ${STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {b.scheduledTime} {b.firstName} {b.lastName[0]}.
                    </Link>
                  ))}
                  {dayBookings.length > 3 && (
                    <p className="text-xs text-gray-400 px-1">+{dayBookings.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
