import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { communityId, subject, message } = await req.json();
  if (!communityId || !subject || !message) {
    return NextResponse.json({ error: "communityId, subject and message are required" }, { status: 400 });
  }

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    include: { alertEmails: { where: { isActive: true } } },
  });
  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  const recipients = community.alertEmails.map((a) => a.email);
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No alert recipients configured for this community" }, { status: 400 });
  }

  const FROM = process.env.EMAIL_FROM ?? "Scheduler <noreply@example.com>";

  try {
    await resend.emails.send({
      from: FROM,
      to: recipients,
      subject,
      html: `<p>${message.replace(/\n/g, "<br>")}</p><hr><p style="font-size:12px;color:#999">${community.name} – Manual Alert</p>`,
    });

    await prisma.emailLog.createMany({
      data: recipients.map((email) => ({
        recipient: email,
        subject,
        trigger: "MANUAL_COMMUNITY_ALERT" as const,
        communityId,
        isError: false,
      })),
    });

    return NextResponse.json({ ok: true, sentTo: recipients.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
