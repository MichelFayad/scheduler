import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCancellationEmail, sendRescheduleEmail } from "@/lib/email";
import { getAvailableSlots } from "@/lib/availability";

async function getBookingByToken(token: string) {
  return prisma.booking.findFirst({
    where: { selfServiceToken: token },
    include: {
      community: {
        include: { alertEmails: { select: { email: true } } },
      },
    },
  });
}

function isWindowExpired(booking: {
  scheduledDate: Date;
  scheduledTime: string;
  community: { selfServiceWindowHours: number };
}) {
  // Close the self-service window selfServiceWindowHours before the appointment
  // itself. The appointment instant combines scheduledDate (@db.Date, UTC midnight)
  // with its "HH:MM" clock time — so a 3pm booking with a 24h window closes at 3pm
  // the day before, not midnight.
  // TZ NOTE: the time is treated as UTC wall-clock (server runs UTC); for US-local
  // appointments this can drift by the local offset (incl. DST). Accepted by design.
  const [hours, minutes] = booking.scheduledTime.split(":").map(Number);
  const appointmentAt = new Date(booking.scheduledDate);
  appointmentAt.setUTCHours(hours, minutes, 0, 0);
  const cutoff = new Date(
    appointmentAt.getTime() - booking.community.selfServiceWindowHours * 60 * 60 * 1000
  );
  return new Date() >= cutoff;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const booking = await getBookingByToken(token);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found or link is invalid." }, { status: 404 });
  }
  return NextResponse.json({
    id: booking.id,
    referenceNumber: booking.referenceNumber,
    firstName: booking.firstName,
    lastName: booking.lastName,
    email: booking.email,
    phone: booking.phone,
    address: booking.propertyAddress,
    inspectionType: booking.inspectionDescription,
    scheduledDate: booking.scheduledDate.toISOString(),
    scheduledTime: booking.scheduledTime,
    status: booking.status,
    selfServiceWindowExpired: isWindowExpired(booking),
    community: { name: booking.community.name },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const booking = await getBookingByToken(token);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found or link is invalid." }, { status: 404 });
  }
  if (!["CONFIRMED", "RESCHEDULED"].includes(booking.status)) {
    return NextResponse.json({ error: "This booking cannot be modified." }, { status: 400 });
  }
  if (isWindowExpired(booking)) {
    return NextResponse.json({ error: "The self-service window has closed for this booking." }, { status: 400 });
  }

  const body = await req.json();
  const { action } = body;
  const alertEmails = booking.community.alertEmails.map((a: { email: string }) => a.email);
  const communityName = booking.community.name;
  const communityId = booking.community.id;

  if (action === "cancel") {
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", cancellationReason: body.reason ?? null, cancelledAt: new Date() },
    });
    sendCancellationEmail({ booking: updated, communityName, communityId, alertEmails, reason: body.reason, byAdmin: false }).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  if (action === "reschedule") {
    const newDate = body.newDate as string;
    const newTime = body.newTime as string;
    if (!newDate || !newTime) {
      return NextResponse.json({ error: "Missing newDate or newTime." }, { status: 400 });
    }
    const slots = await getAvailableSlots(booking.communityId, newDate);
    const slot = slots.find((s) => s.time === newTime);
    if (!slot || slot.available <= 0) {
      return NextResponse.json({ error: "That slot is no longer available." }, { status: 409 });
    }
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { scheduledDate: new Date(newDate + "T00:00:00.000Z"), scheduledTime: newTime, status: "RESCHEDULED" },
    });
    sendRescheduleEmail({
      booking: { ...updated, selfServiceToken: updated.selfServiceToken ?? token },
      communityName,
      communityId,
      alertEmails,
      byAdmin: false,
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
