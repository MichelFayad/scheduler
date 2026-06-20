import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateSelfServiceToken } from "@/lib/utils";
import { sendCancellationEmail, sendRescheduleEmail } from "@/lib/email";
import { getAvailableSlots } from "@/lib/availability";
import { z } from "zod";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), reason: z.string().optional() }),
  z.object({ action: z.literal("no_show") }),
  z.object({ action: z.literal("complete") }),
  z.object({
    action: z.literal("reschedule"),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  z.object({
    action: z.literal("update_details"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Valid email required"),
    phone: z.string().optional(),
    propertyAddress: z.string().min(1, "Property address is required"),
    inspectionDescription: z.string().min(1, "Please describe the inspection"),
    notes: z.string().optional(),
  }),
]);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      community: { include: { alertEmails: { where: { isActive: true } } } },
      emailLogs: { orderBy: { sentAt: "desc" }, take: 20 },
    },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(booking);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = ActionSchema.parse(await req.json());

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { community: { include: { alertEmails: { where: { isActive: true } } } } },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const alertEmails = booking.community.alertEmails.map((a) => a.email);

  if (body.action === "cancel") {
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: body.reason ?? null },
    });
    sendCancellationEmail({
      booking: { ...booking, scheduledDate: booking.scheduledDate },
      communityName: booking.community.name,
      communityId: booking.communityId,
      alertEmails,
      reason: body.reason,
      byAdmin: true,
    }).catch(console.error);
    return NextResponse.json(updated);
  }

  if (body.action === "no_show") {
    const updated = await prisma.booking.update({ where: { id }, data: { status: "NO_SHOW" } });
    return NextResponse.json(updated);
  }

  if (body.action === "complete") {
    const updated = await prisma.booking.update({ where: { id }, data: { status: "COMPLETED" } });
    return NextResponse.json(updated);
  }

  if (body.action === "update_details") {
    // Correcting customer/property/inspection details. Does not change the slot
    // or status, and intentionally sends no notification (it's an admin fix).
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone ?? null,
        propertyAddress: body.propertyAddress,
        inspectionDescription: body.inspectionDescription,
        notes: body.notes ?? null,
      },
    });
    return NextResponse.json(updated);
  }

  if (body.action === "reschedule") {
    const slots = await getAvailableSlots(booking.communityId, body.scheduledDate);
    const slot = slots.find((s) => s.time === body.scheduledTime);
    if (!slot || slot.available <= 0) {
      return NextResponse.json({ error: "Slot not available" }, { status: 409 });
    }

    const newToken = generateSelfServiceToken();
    const scheduledAt = new Date(`${body.scheduledDate}T${body.scheduledTime}:00`);
    const tokenExpiresAt = new Date(
      scheduledAt.getTime() - booking.community.selfServiceWindowHours * 60 * 60 * 1000
    );

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        scheduledDate: new Date(body.scheduledDate + "T00:00:00Z"),
        scheduledTime: body.scheduledTime,
        rescheduledFromId: booking.id,
        selfServiceToken: newToken,
        tokenExpiresAt,
        status: "CONFIRMED",
      },
    });

    sendRescheduleEmail({
      booking: {
        ...updated,
        scheduledDate: updated.scheduledDate,
        selfServiceToken: newToken,
      },
      communityName: booking.community.name,
      communityId: booking.communityId,
      alertEmails,
      byAdmin: true,
    }).catch(console.error);

    return NextResponse.json(updated);
  }
}
