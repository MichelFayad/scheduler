import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  // Defence in depth — middleware already gates /admin/*.
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [total, confirmed, cancelled, noShow, completed, byCommunity] =
    await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.booking.count({ where: { status: "CANCELLED" } }),
      prisma.booking.count({ where: { status: "NO_SHOW" } }),
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.booking.groupBy({
        by: ["communityId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
    ]);

  const communities = await prisma.community.findMany({
    where: { id: { in: byCommunity.map((b) => b.communityId) } },
    select: { id: true, name: true },
  });
  const nameOf = Object.fromEntries(communities.map((c) => [c.id, c.name]));

  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) + "%" : "0%");

  const lines: string[][] = [
    ["Metric", "Value"],
    ["Total bookings", String(total)],
    ["Confirmed", String(confirmed)],
    ["Completed", String(completed)],
    ["Cancelled", String(cancelled)],
    ["No shows", String(noShow)],
    ["Cancellation rate", pct(cancelled)],
    ["No-show rate", pct(noShow)],
    [],
    ["Community", "Bookings"],
    ...byCommunity.map((row) => [
      nameOf[row.communityId] ?? row.communityId,
      String(row._count.id),
    ]),
  ];

  const csv = lines.map((r) => r.map(csvCell).join(",")).join("\n");
  const filename = `report-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
