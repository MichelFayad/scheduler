import { Resend } from "resend";
import { prisma } from "./prisma";
import type { EmailTrigger } from "@prisma/client";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM ?? "Scheduler <noreply@example.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Low-level send + log
// ---------------------------------------------------------------------------

async function sendAndLog({
  to,
  subject,
  html,
  trigger,
  communityId,
  bookingId,
}: {
  to: string | string[];
  subject: string;
  html: string;
  trigger: EmailTrigger;
  communityId: string;
  bookingId?: string;
}) {
  const recipients = Array.isArray(to) ? to : [to];

  const logResult = (isError: boolean, errorMessage?: string) =>
    prisma.emailLog.createMany({
      data: recipients.map((recipient) => ({
        recipient,
        subject,
        trigger,
        communityId,
        bookingId: bookingId ?? null,
        isError,
        errorMessage: errorMessage ?? null,
      })),
    });

  try {
    // Resend does not throw on API errors — it returns { data, error }. We must
    // inspect `error` explicitly, otherwise failed sends get logged as success.
    const { error } = await resend.emails.send({ from: FROM, to: recipients, subject, html });

    if (error) {
      const message = error.message ?? String(error);
      await logResult(true, message);
      console.error("[email] send error", message);
      return;
    }

    await logResult(false);
  } catch (err) {
    // Thrown exceptions (network failures, unexpected SDK errors)
    const message = err instanceof Error ? err.message : String(err);
    await logResult(true, message);
    console.error("[email] send error", message);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(date: Date | string, time: string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at ${time}`;
}

function bookingTable(b: {
  referenceNumber: string;
  communityName: string;
  firstName: string;
  lastName: string;
  propertyAddress: string;
  inspectionDescription: string;
  scheduledDate: Date | string;
  scheduledTime: string;
}) {
  return `
    <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">
      <tr><td style="padding:6px 12px;color:#666">Reference</td><td style="padding:6px 12px;font-weight:bold">${b.referenceNumber}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:6px 12px;color:#666">Community</td><td style="padding:6px 12px">${b.communityName}</td></tr>
      <tr><td style="padding:6px 12px;color:#666">Name</td><td style="padding:6px 12px">${b.firstName} ${b.lastName}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:6px 12px;color:#666">Property</td><td style="padding:6px 12px">${b.propertyAddress}</td></tr>
      <tr><td style="padding:6px 12px;color:#666">Date &amp; Time</td><td style="padding:6px 12px">${formatDateTime(b.scheduledDate, b.scheduledTime)}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:6px 12px;color:#666">Inspection</td><td style="padding:6px 12px">${b.inspectionDescription}</td></tr>
    </table>
  `;
}

// ---------------------------------------------------------------------------
// Public email functions
// ---------------------------------------------------------------------------

export async function sendBookingConfirmation({
  booking,
  communityName,
  communityId,
  alertEmails,
}: {
  booking: {
    id: string;
    referenceNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    propertyAddress: string;
    inspectionDescription: string;
    scheduledDate: Date;
    scheduledTime: string;
    selfServiceToken: string;
  };
  communityName: string;
  communityId: string;
  alertEmails: string[];
}) {
  const manageUrl = `${APP_URL}/manage/${booking.selfServiceToken}`;

  // Confirmation to user
  await sendAndLog({
    to: booking.email,
    subject: `Inspection Booking Confirmed – ${booking.referenceNumber}`,
    html: `
      <p>Hi ${booking.firstName},</p>
      <p>Your inspection booking has been confirmed. Here are the details:</p>
      ${bookingTable({ ...booking, communityName })}
      <p style="margin-top:24px">
        <a href="${manageUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-family:sans-serif">
          Manage My Booking
        </a>
      </p>
      <p style="font-size:12px;color:#999;margin-top:16px">
        Use the button above to cancel or reschedule your booking. This link is unique to your booking — please do not share it.
      </p>
    `,
    trigger: "BOOKING_CONFIRMED",
    communityId,
    bookingId: booking.id,
  });

  // Alert to community distribution list
  if (alertEmails.length > 0) {
    await sendAndLog({
      to: alertEmails,
      subject: `New Inspection Scheduled – ${communityName}`,
      html: `
        <p>A new inspection has been scheduled for <strong>${communityName}</strong>.</p>
        ${bookingTable({ ...booking, communityName })}
      `,
      trigger: "BOOKING_CONFIRMED",
      communityId,
      bookingId: booking.id,
    });
  }
}

export async function sendCancellationEmail({
  booking,
  communityName,
  communityId,
  alertEmails,
  reason,
  byAdmin,
}: {
  booking: {
    id: string;
    referenceNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    propertyAddress: string;
    inspectionDescription: string;
    scheduledDate: Date;
    scheduledTime: string;
  };
  communityName: string;
  communityId: string;
  alertEmails: string[];
  reason?: string;
  byAdmin: boolean;
}) {
  const trigger: EmailTrigger = byAdmin ? "BOOKING_CANCELLED_ADMIN" : "BOOKING_CANCELLED_USER";
  const reasonHtml = reason ? `<p><strong>Reason:</strong> ${reason}</p>` : "";

  await sendAndLog({
    to: booking.email,
    subject: `Inspection Booking Cancelled – ${booking.referenceNumber}`,
    html: `
      <p>Hi ${booking.firstName},</p>
      <p>Your inspection booking has been cancelled.</p>
      ${bookingTable({ ...booking, communityName })}
      ${reasonHtml}
      <p>If you did not request this cancellation, please contact us.</p>
    `,
    trigger,
    communityId,
    bookingId: booking.id,
  });

  if (alertEmails.length > 0) {
    await sendAndLog({
      to: alertEmails,
      subject: `Inspection Cancelled – ${communityName} – ${booking.referenceNumber}`,
      html: `
        <p>An inspection booking has been cancelled for <strong>${communityName}</strong>.</p>
        ${bookingTable({ ...booking, communityName })}
        ${reasonHtml}
      `,
      trigger,
      communityId,
      bookingId: booking.id,
    });
  }
}

export async function sendRescheduleEmail({
  booking,
  communityName,
  communityId,
  alertEmails,
  byAdmin,
}: {
  booking: {
    id: string;
    referenceNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    propertyAddress: string;
    inspectionDescription: string;
    scheduledDate: Date;
    scheduledTime: string;
    selfServiceToken: string;
  };
  communityName: string;
  communityId: string;
  alertEmails: string[];
  byAdmin: boolean;
}) {
  const trigger: EmailTrigger = byAdmin ? "BOOKING_RESCHEDULED_ADMIN" : "BOOKING_RESCHEDULED_USER";
  const manageUrl = `${APP_URL}/manage/${booking.selfServiceToken}`;

  await sendAndLog({
    to: booking.email,
    subject: `Inspection Booking Rescheduled – ${booking.referenceNumber}`,
    html: `
      <p>Hi ${booking.firstName},</p>
      <p>Your inspection booking has been rescheduled. Here are your updated details:</p>
      ${bookingTable({ ...booking, communityName })}
      <p style="margin-top:24px">
        <a href="${manageUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-family:sans-serif">
          Manage My Booking
        </a>
      </p>
    `,
    trigger,
    communityId,
    bookingId: booking.id,
  });

  if (alertEmails.length > 0) {
    await sendAndLog({
      to: alertEmails,
      subject: `Inspection Rescheduled – ${communityName} – ${booking.referenceNumber}`,
      html: `
        <p>An inspection booking has been rescheduled for <strong>${communityName}</strong>.</p>
        ${bookingTable({ ...booking, communityName })}
      `,
      trigger,
      communityId,
      bookingId: booking.id,
    });
  }
}

export async function sendReminderEmail({
  booking,
  communityName,
  communityId,
}: {
  booking: {
    id: string;
    referenceNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    propertyAddress: string;
    inspectionDescription: string;
    scheduledDate: Date;
    scheduledTime: string;
    selfServiceToken: string;
  };
  communityName: string;
  communityId: string;
}) {
  const manageUrl = `${APP_URL}/manage/${booking.selfServiceToken}`;

  await sendAndLog({
    to: booking.email,
    subject: `Reminder: Inspection Tomorrow – ${booking.referenceNumber}`,
    html: `
      <p>Hi ${booking.firstName},</p>
      <p>This is a reminder about your upcoming inspection:</p>
      ${bookingTable({ ...booking, communityName })}
      <p style="margin-top:24px">
        <a href="${manageUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-family:sans-serif">
          Manage My Booking
        </a>
      </p>
    `,
    trigger: "BOOKING_REMINDER",
    communityId,
    bookingId: booking.id,
  });
}
