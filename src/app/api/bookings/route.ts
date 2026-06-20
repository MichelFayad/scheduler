import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/availability";
import { createBookingWithReference } from "@/lib/bookings";
import { generateSelfServiceToken } from "@/lib/utils";
import { sendBookingConfirmation } from "@/lib/email";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const BookingSchema = z.object({
  communityId: z.string().min(1),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  propertyAddress: z.string().min(1, "Property address is required"),
  inspectionDescription: z.string().min(1, "Please describe the inspection"),
  notes: z.string().optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  consent: z.literal(true, { errorMap: () => ({ message: "You must agree to the terms" }) }),
  website: z.string().optional(), // honeypot — must be empty
  recaptchaToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`booking:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const data = BookingSchema.parse(body);

    // Honeypot tripped → silently reject (don't tip off bots).
    if (data.website && data.website.trim() !== "") {
      return NextResponse.json({ error: "Something went wrong" }, { status: 400 });
    }

    // reCAPTCHA (no-ops when keys unset; honeypot + rate limit still apply).
    if (!(await verifyRecaptcha(data.recaptchaToken, ip))) {
      return NextResponse.json(
        { error: "Spam check failed. Please try again." },
        { status: 400 }
      );
    }

    // Verify the community exists and is active
    const community = await prisma.community.findUnique({
      where: { id: data.communityId, isActive: true },
      include: {
        alertEmails: { where: { isActive: true }, select: { email: true } },
      },
    });
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Verify the slot is still available
    const slots = await getAvailableSlots(data.communityId, data.scheduledDate);
    const slot = slots.find((s) => s.time === data.scheduledTime);
    if (!slot || slot.available <= 0) {
      return NextResponse.json(
        { error: "This time slot is no longer available. Please choose another." },
        { status: 409 }
      );
    }

    // Self-service token — valid until the community's self-service window closes.
    // TZ NOTE: scheduledAt is built from wall-clock date+time with no zone, so it
    // resolves in the server's zone (UTC on Vercel). For US-local appointments the
    // expiry instant can drift by the local UTC offset (incl. DST). Accepted by
    // design; use a real IANA timezone here if exact expiry timing is needed.
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
    });

    // Send confirmation + community alert (non-blocking)
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

    return NextResponse.json({
      referenceNumber: booking.referenceNumber,
      bookingId: booking.id,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: err.issues }, { status: 422 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
