import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const RuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDurationMins: z.number().int().min(15),
  // null / omitted = inherit the community's defaultMaxPerSlot
  maxPerSlot: z.number().int().min(1).nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const rules = await prisma.scheduleRule.findMany({
    where: { communityId: id, isActive: true },
    orderBy: { dayOfWeek: "asc" },
  });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = RuleSchema.parse(await req.json());
  const rule = await prisma.scheduleRule.create({ data: { ...data, communityId: id } });
  return NextResponse.json(rule, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { ruleId } = await req.json();
  await prisma.scheduleRule.update({ where: { id: ruleId, communityId: id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
