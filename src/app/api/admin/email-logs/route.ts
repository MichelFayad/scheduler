import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const logs = await prisma.emailLog.findMany({
    orderBy: { sentAt: "desc" },
    take: 50,
    include: { booking: { select: { referenceNumber: true } } },
  });
  return NextResponse.json(logs);
}
