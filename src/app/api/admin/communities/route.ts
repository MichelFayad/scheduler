import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CommunitySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens"),
  selfServiceWindowHours: z.number().int().min(0),
  minAdvanceBookingHours: z.number().int().min(0),
  maxFutureDays: z.number().int().min(1),
  defaultMaxPerSlot: z.number().int().min(1).optional(),
  reminderEnabled: z.boolean(),
  reminderHoursBefore: z.number().int().min(1),
  senderName: z.string().min(1),
  replyToEmail: z.string().email().optional().or(z.literal("")),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const communities = await prisma.community.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { bookings: true } },
      alertEmails: { where: { isActive: true }, select: { email: true } },
      scheduleRules: { where: { isActive: true } },
    },
  });
  return NextResponse.json(communities);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data = CommunitySchema.parse(body);

  const community = await prisma.community.create({
    data: {
      ...data,
      replyToEmail: data.replyToEmail || null,
    },
  });
  return NextResponse.json(community, { status: 201 });
}
