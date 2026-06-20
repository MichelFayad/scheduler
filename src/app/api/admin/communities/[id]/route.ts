import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  selfServiceWindowHours: z.number().int().min(0).optional(),
  minAdvanceBookingHours: z.number().int().min(0).optional(),
  maxFutureDays: z.number().int().min(1).optional(),
  defaultMaxPerSlot: z.number().int().min(1).optional(),
  reminderEnabled: z.boolean().optional(),
  reminderHoursBefore: z.number().int().min(1).optional(),
  senderName: z.string().min(1).optional(),
  replyToEmail: z.string().email().optional().or(z.literal("")),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const community = await prisma.community.findUnique({ where: { id } });
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(community);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const data = UpdateSchema.parse(body);
  const community = await prisma.community.update({
    where: { id },
    data: { ...data, replyToEmail: data.replyToEmail || null },
  });
  return NextResponse.json(community);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.community.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
