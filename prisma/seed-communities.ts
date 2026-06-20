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

const prisma = new PrismaClient();

const communities = [
  {
    name: "Sunrise Village",
    slug: "sunrise-village",
    alertEmail: "alerts@sunrise-village.example.com",
    senderName: "Sunrise Village Inspections",
  },
  {
    name: "Lakewood Estate",
    slug: "lakewood-estate",
    alertEmail: "alerts@lakewood-estate.example.com",
    senderName: "Lakewood Estate Inspections",
  },
  {
    name: "Maplewood Gardens",
    slug: "maplewood-gardens",
    alertEmail: "alerts@maplewood-gardens.example.com",
    senderName: "Maplewood Gardens Inspections",
  },
  {
    name: "Riverside Heights",
    slug: "riverside-heights",
    alertEmail: "alerts@riverside-heights.example.com",
    senderName: "Riverside Heights Inspections",
  },
  {
    name: "Oakwood Park",
    slug: "oakwood-park",
    alertEmail: "alerts@oakwood-park.example.com",
    senderName: "Oakwood Park Inspections",
  },
];

async function main() {
  console.log("🌱 Seeding communities…");

  for (const c of communities) {
    const community = await prisma.community.upsert({
      where: { slug: c.slug },
      update: { name: c.name, senderName: c.senderName },
      create: {
        name: c.name,
        slug: c.slug,
        senderName: c.senderName,
        selfServiceWindowHours: 24,
        minAdvanceBookingHours: 24,
        maxFutureDays: 60,
        reminderEnabled: true,
        reminderHoursBefore: 24,
        alertEmails: {
          create: [{ email: c.alertEmail }],
        },
      },
    });

    // Ensure Mon–Fri schedule rules exist
    for (const day of [1, 2, 3, 4, 5]) {
      await prisma.scheduleRule.upsert({
        where: { id: `rule-${community.id}-${day}` },
        update: {},
        create: {
          id: `rule-${community.id}-${day}`,
          communityId: community.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "16:00",
          slotDurationMins: 60,
          maxPerSlot: 1,
        },
      });
    }

    console.log(`  ✅ ${c.name}`);
  }

  console.log("\n🎉 Done!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
