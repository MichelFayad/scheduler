import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  // Defence in depth — middleware already gates /admin/*.
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const community = searchParams.get("community") || undefined;
  const status = searchParams.get("status") || undefined;
  const q = searchParams.get("q") || undefined;

  const bookings = await prisma.booking.findMany({
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
  });

  const headers = [
    "Reference", "Community", "First Name", "Last Name", "Email", "Phone",
    "Property", "Inspection", "Notes", "Date", "Time", "Status", "Created",
  ];

  const rows = bookings.map((b) => [
    b.referenceNumber,
    b.community.name,
    b.firstName,
    b.lastName,
    b.email,
    b.phone ?? "",
    b.propertyAddress,
    b.inspectionDescription,
    b.notes ?? "",
    new Date(b.scheduledDate).toISOString().slice(0, 10),
    b.scheduledTime,
    b.status,
    b.createdAt.toISOString(),
  ]);

  const csv = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  const filename = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
