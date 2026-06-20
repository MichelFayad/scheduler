import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

// Combine a booking's stored date (@db.Date, UTC midnight) with its "HH:MM"
// clock time into a single UTC instant for the appointment.
// TZ NOTE: the time is treated as UTC wall-clock. The app mainly serves US
// users, so the resulting instant can be off by the local UTC offset (incl.
// DST). In practice the daily cron's own ~24h granularity dominates this drift,
// so reminders still land on the right day. Accepted by design; switch to a real
// IANA timezone here if hour-accurate reminders are ever required.
function appointmentInstant(scheduledDate: Date, scheduledTime: string): Date {
  const [hours, minutes] = scheduledTime.split(":").map(Number);
  const at = new Date(scheduledDate);
  at.setUTCHours(hours, minutes, 0, 0);
  return at;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Pull every upcoming un-reminded booking for reminder-enabled communities,
  // then decide per-booking using the community's own reminderHoursBefore.
  // (A daily cron can't hit the exact hour, so we send once the threshold has
  // passed; the reminderSentAt flag guarantees each booking is sent at most once.)
  const candidates = await prisma.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "RESCHEDULED"] },
      scheduledDate: { gte: todayStart },
      reminderSentAt: null,
      community: { reminderEnabled: true },
    },
    include: {
      community: { select: { id: true, name: true, reminderHoursBefore: true } },
    },
  });

  const bookings = candidates.filter((booking) => {
    const apptAt = appointmentInstant(booking.scheduledDate, booking.scheduledTime);
    if (apptAt <= now) return false; // appointment already passed — no reminder
    const thresholdAt = new Date(
      apptAt.getTime() - booking.community.reminderHoursBefore * 60 * 60 * 1000
    );
    return now >= thresholdAt;
  });

  let sent = 0;
  let failed = 0;

  for (const booking of bookings) {
    try {
      await sendReminderEmail({
        booking: {
          ...booking,
          selfServiceToken: booking.selfServiceToken ?? "",
        },
        communityName: booking.community.name,
        communityId: booking.community.id,
      });
      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminderSentAt: new Date() },
      });
      sent++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ processed: bookings.length, sent, failed });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
