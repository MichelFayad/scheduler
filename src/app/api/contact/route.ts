import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const ContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  message: z.string().min(1, "Message is required"),
  website: z.string().optional(), // honeypot — must be empty
  recaptchaToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`contact:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const data = ContactSchema.parse(await req.json());

    // Honeypot tripped → silently accept and drop (don't tip off bots).
    if (data.website && data.website.trim() !== "") {
      return NextResponse.json({ ok: true });
    }

    if (!(await verifyRecaptcha(data.recaptchaToken, ip))) {
      return NextResponse.json(
        { error: "Spam check failed. Please try again." },
        { status: 400 }
      );
    }

    const to = process.env.CONTACT_EMAIL;
    if (to && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.EMAIL_FROM ?? "Scheduler <noreply@example.com>";
      await resend.emails.send({
        from,
        to,
        subject: `New contact inquiry from ${data.name}`,
        html: `
          <p><strong>From:</strong> ${data.name} (${data.email})</p>
          <p><strong>Message:</strong></p>
          <p>${data.message.replace(/\n/g, "<br>")}</p>
        `,
      });
    } else {
      // No mailbox configured — log so the inquiry isn't silently lost in dev.
      console.log("[contact] inquiry (CONTACT_EMAIL not set):", {
        name: data.name,
        email: data.email,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: err.issues },
        { status: 422 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
