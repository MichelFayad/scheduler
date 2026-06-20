/**
 * Seed script — creates a super admin and a sample community with schedule rules.
 * Run with: npm run db:seed
 */

// Load .env before Prisma client initialises
import { readFileSync } from "fs";
import { resolve } from "path";
try {
  const raw = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {}

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database…");

  // Super admin. Password comes from SEED_ADMIN_PASSWORD so deployed/test
  // environments don't ship a known default; falls back to a dev-only value.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.adminUser.upsert({
    where: { email: "admin@scheduler.local" },
    update: {},
    create: {
      email: "admin@scheduler.local",
      passwordHash,
      name: "Super Admin",
      role: "SUPER_ADMIN",
    },
  });
  console.log(`✅ Admin created: ${admin.email} (password: ${adminPassword})`);

  // Sample community
  const community = await prisma.community.upsert({
    where: { slug: "sunrise-village" },
    update: {},
    create: {
      name: "Sunrise Village",
      slug: "sunrise-village",
      selfServiceWindowHours: 24,
      minAdvanceBookingHours: 24,
      maxFutureDays: 60,
      reminderEnabled: true,
      reminderHoursBefore: 24,
      senderName: "Sunrise Village Inspections",
      alertEmails: {
        create: [{ email: "alerts@sunrise-village.example.com" }],
      },
    },
  });
  console.log(`✅ Community created: ${community.name}`);

  // Schedule rules: Mon–Fri 9am–4pm, 60-min slots, 1 booking per slot
  const weekdays = [1, 2, 3, 4, 5]; // Mon–Fri
  for (const day of weekdays) {
    await prisma.scheduleRule.upsert({
      where: {
        id: `seed-rule-${community.id}-${day}`,
      },
      update: {},
      create: {
        id: `seed-rule-${community.id}-${day}`,
        communityId: community.id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "16:00",
        slotDurationMins: 60,
        maxPerSlot: 1,
      },
    });
  }
  console.log("✅ Schedule rules created (Mon–Fri, 9am–4pm, 60-min slots)");

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
