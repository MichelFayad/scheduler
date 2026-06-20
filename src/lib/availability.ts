/**
 * Availability engine
 *
 * Given a community and a date range, computes which dates have open slots
 * and which specific time slots are still available on a given date.
 */

import { prisma } from "./prisma";
import { generateTimeSlots, toDateString } from "./utils";
import type { BookingStatus } from "@prisma/client";

/**
 * Booking statuses that occupy a slot's capacity. CANCELLED frees the slot;
 * RESCHEDULED is still an active, live booking sitting in its (new) slot, so it
 * must count — otherwise a rescheduled booking's slot would be offered again.
 */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["CONFIRMED", "RESCHEDULED"];

/** Returns all time slots available for a community on a specific date */
export async function getAvailableSlots(
  communityId: string,
  dateStr: string, // "YYYY-MM-DD"
  defaultMaxPerSlot?: number // community fallback; fetched if not supplied
): Promise<{ time: string; available: number; booked: number; max: number }[]> {
  const date = new Date(dateStr + "T00:00:00Z");
  const dayOfWeek = date.getUTCDay();

  // 1. Check for a date override that blocks the entire day
  const override = await prisma.dateOverride.findUnique({
    where: { communityId_date: { communityId, date } },
  });

  if (override?.isBlocked) return [];

  // 2. Find the recurring rule for this day of week
  const rule = await prisma.scheduleRule.findFirst({
    where: { communityId, dayOfWeek, isActive: true },
  });

  if (!rule) return [];

  // Community default capacity, used when neither the date override nor the
  // rule specifies a per-slot max.
  const communityDefaultMax =
    defaultMaxPerSlot ??
    (await prisma.community.findUnique({
      where: { id: communityId },
      select: { defaultMaxPerSlot: true },
    }))?.defaultMaxPerSlot ??
    1;

  // 3. Generate raw slots from the rule
  const rawSlots = generateTimeSlots(rule.startTime, rule.endTime, rule.slotDurationMins);

  // 4. Apply per-slot overrides from the date override (if any)
  type SlotOverride = { time: string; maxPerSlot: number };
  const slotOverrideMap: Record<string, number> = {};
  if (override?.slotOverrides) {
    const overrides = override.slotOverrides as SlotOverride[];
    for (const so of overrides) {
      slotOverrideMap[so.time] = so.maxPerSlot;
    }
  }

  // 5. Count active (slot-occupying) bookings per slot on this date
  const bookingCounts = await prisma.booking.groupBy({
    by: ["scheduledTime"],
    where: {
      communityId,
      scheduledDate: date,
      status: { in: ACTIVE_BOOKING_STATUSES },
    },
    _count: { scheduledTime: true },
  });

  const bookedMap: Record<string, number> = {};
  for (const bc of bookingCounts) {
    bookedMap[bc.scheduledTime] = bc._count.scheduledTime;
  }

  // 6. Build result.
  // Effective capacity precedence: date override → schedule rule → community default.
  return rawSlots.map((time) => {
    const max = slotOverrideMap[time] ?? rule.maxPerSlot ?? communityDefaultMax;
    const booked = bookedMap[time] ?? 0;
    return { time, available: Math.max(0, max - booked), booked, max };
  });
}

/** Returns all dates with at least one available slot in a given month */
export async function getAvailableDatesInMonth(
  communityId: string,
  year: number,
  month: number // 1-12
): Promise<string[]> {
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  if (!community) return [];

  // TZ NOTE: the min-advance window compares real `now` against calendar dates
  // that are treated as UTC wall-clock (the server runs UTC). The app mainly
  // serves US users, so this edge can drift by the local UTC offset (incl. DST)
  // — e.g. a slot may open/close a few hours early or late near the boundary.
  // Accepted by design; revisit with a real IANA timezone if precision matters.
  const now = new Date();
  const minDate = new Date(now.getTime() + community.minAdvanceBookingHours * 60 * 60 * 1000);
  const maxDate = new Date(now.getTime() + community.maxFutureDays * 24 * 60 * 60 * 1000);

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const lastOfMonth = new Date(Date.UTC(year, month, 0));

  const rangeStart = firstOfMonth > minDate ? firstOfMonth : minDate;
  const rangeEnd = lastOfMonth < maxDate ? lastOfMonth : maxDate;

  if (rangeStart > rangeEnd) return [];

  // All rules active for this community
  const rules = await prisma.scheduleRule.findMany({
    where: { communityId, isActive: true },
  });

  const activeDays = new Set(rules.map((r) => r.dayOfWeek));

  // All blocked overrides in range
  const blockedOverrides = await prisma.dateOverride.findMany({
    where: {
      communityId,
      date: { gte: rangeStart, lte: rangeEnd },
      isBlocked: true,
    },
    select: { date: true },
  });
  const blockedSet = new Set(blockedOverrides.map((o) => toDateString(new Date(o.date))));

  // Walk each day in the range
  const available: string[] = [];
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    const ds = toDateString(cursor);
    if (activeDays.has(cursor.getUTCDay()) && !blockedSet.has(ds)) {
      // Quick slot-level check: get slots and see if any are open
      const slots = await getAvailableSlots(communityId, ds, community.defaultMaxPerSlot);
      if (slots.some((s) => s.available > 0)) {
        available.push(ds);
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return available;
}
