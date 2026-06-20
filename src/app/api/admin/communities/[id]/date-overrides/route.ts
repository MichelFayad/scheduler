import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isBlocked: z.boolean().default(false),
  note: z.string().optional(),
  // Per-slot capacity overrides for this date (e.g. close 13:00, or allow 3 at 09:00).
  // maxPerSlot 0 = that slot is closed for the day.
  slotOverrides: z
    .array(z.object({ time: z.string().regex(/^\d{2}:\d{2}$/), maxPerSlot: z.number().int().min(0) }))
    .optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const overrides = await prisma.dateOverride.findMany({
    where: { communityId: id },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(overrides);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = CreateSchema.parse(await req.json());
  const date = new Date(body.date + "T00:00:00.000Z");
  const slotOverrides =
    body.slotOverrides && body.slotOverrides.length > 0 ? body.slotOverrides : Prisma.JsonNull;
  const override = await prisma.dateOverride.upsert({
    where: { communityId_date: { communityId: id, date } },
    create: { communityId: id, date, isBlocked: body.isBlocked, reason: body.note, slotOverrides },
    update: { isBlocked: body.isBlocked, reason: body.note, slotOverrides },
  });
  return NextResponse.json(override);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { date } = await req.json();
  const dateObj = new Date(date + "T00:00:00.000Z");
  await prisma.dateOverride.delete({
    where: { communityId_date: { communityId: id, date: dateObj } },
  });
  return NextResponse.json({ ok: true });
}
