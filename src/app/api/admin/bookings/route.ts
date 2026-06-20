import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createBookingWithReference } from "@/lib/bookings";
import { generateSelfServiceToken } from "@/lib/utils";
import { sendBookingConfirmation } from "@/lib/email";

const Schema = z.object({
  communityId: z.string().min(1),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  propertyAddress: z.string().min(1, "Property address is required"),
  inspectionDescription: z.string().min(1, "Please describe the inspection"),
  notes: z.string().optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  // Admins can suppress emails for phone/walk-in bookings.
  sendNotifications: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let data;
  try {
    data = Schema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: err.issues }, { status: 422 });
    }
    throw err;
  }

  const community = await prisma.community.findUnique({
    where: { id: data.communityId, isActive: true },
    include: { alertEmails: { where: { isActive: true }, select: { email: true } } },
  });
  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  // Admin bookings intentionally bypass capacity / advance-window / blocked-date
  // checks — staff may need to fit a booking in or place one on a closed day.
  const token = generateSelfServiceToken();
  const scheduledAt = new Date(`${data.scheduledDate}T${data.scheduledTime}:00`);
  const tokenExpiresAt = new Date(
    scheduledAt.getTime() - community.selfServiceWindowHours * 60 * 60 * 1000
  );

  const booking = await createBookingWithReference({
    communityId: data.communityId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone ?? null,
    propertyAddress: data.propertyAddress,
    inspectionDescription: data.inspectionDescription,
    notes: data.notes ?? null,
    scheduledDate: new Date(data.scheduledDate + "T00:00:00Z"),
    scheduledTime: data.scheduledTime,
    selfServiceToken: token,
    tokenExpiresAt,
    createdByAdminId: session.user.id,
  });

  if (data.sendNotifications) {
    sendBookingConfirmation({
      booking: {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
        firstName: booking.firstName,
        lastName: booking.lastName,
        email: booking.email,
        propertyAddress: booking.propertyAddress,
        inspectionDescription: booking.inspectionDescription,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        selfServiceToken: token,
      },
      communityName: community.name,
      communityId: community.id,
      alertEmails: community.alertEmails.map((a) => a.email),
    }).catch(console.error);
  }

  return NextResponse.json({ referenceNumber: booking.referenceNumber, bookingId: booking.id }, { status: 201 });
}
