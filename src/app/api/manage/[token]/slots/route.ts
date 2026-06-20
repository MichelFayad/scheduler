import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/availability";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const date = req.nextUrl.searchParams.get("date");

  if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  const booking = await prisma.booking.findFirst({
    where: { selfServiceToken: token },
    select: { communityId: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const slots = await getAvailableSlots(booking.communityId, date);
  return NextResponse.json(slots);
}
