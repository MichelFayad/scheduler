import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  NO_SHOW: "bg-yellow-100 text-yellow-700",
  RESCHEDULED: "bg-blue-100 text-blue-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ")}
    </span>
  );
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ community?: string; status?: string; q?: string }>;
}) {
  const { community, status, q } = await searchParams;

  const [bookings, communities] = await Promise.all([
    prisma.booking.findMany({
      where: {
        ...(community ? { communityId: community } : {}),
        ...(status ? { status: status as never } : {}),
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { propertyAddress: { contains: q, mode: "insensitive" } },
                { referenceNumber: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { community: { select: { name: true } } },
      orderBy: [{ scheduledDate: "desc" }, { scheduledTime: "asc" }],
      take: 100,
    }),
    prisma.community.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Bookings</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/bookings/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Booking
          </Link>
          <a
            href={`/admin/bookings/export?${new URLSearchParams({
              ...(community ? { community } : {}),
              ...(status ? { status } : {}),
              ...(q ? { q } : {}),
            }).toString()}`}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email, address, ref…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          name="community"
          defaultValue={community ?? ""}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All communities</option>
          {communities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="COMPLETED">Completed</option>
          <option value="NO_SHOW">No show</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Filter
        </button>
        {(q || community || status) && (
          <Link
            href="/admin/bookings"
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {bookings.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-16">No bookings found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Reference", "Name", "Community", "Property", "Date", "Time", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    <Link href={`/admin/bookings/${b.id}`} className="hover:text-blue-600">{b.referenceNumber}</Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/admin/bookings/${b.id}`} className="hover:text-blue-600">{b.firstName} {b.lastName}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.community.name}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{b.propertyAddress}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {new Date(b.scheduledDate).toLocaleDateString("en-US", { timeZone: "UTC" })}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.scheduledTime}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-gray-400">{bookings.length} booking{bookings.length !== 1 ? "s" : ""} shown</p>
    </div>
  );
}
