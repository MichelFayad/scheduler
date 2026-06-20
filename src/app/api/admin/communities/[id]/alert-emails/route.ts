import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const emails = await prisma.communityAlertEmail.findMany({
    where: { communityId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(emails);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { email } = await req.json();
  const record = await prisma.communityAlertEmail.upsert({
    where: { communityId_email: { communityId: id, email } },
    create: { communityId: id, email, isActive: true },
    update: { isActive: true },
  });
  return NextResponse.json(record, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { email } = await req.json();
  await prisma.communityAlertEmail.updateMany({
    where: { communityId: id, email },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
