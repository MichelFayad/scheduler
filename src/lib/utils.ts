import { v4 as uuidv4 } from "uuid";

/** Generate a human-readable booking reference, e.g. SCH-2026-00042 */
export function generateReferenceNumber(seq: number): string {
  const year = new Date().getFullYear();
  return `SCH-${year}-${String(seq).padStart(5, "0")}`;
}

/** Generate a secure self-service token */
export function generateSelfServiceToken(): string {
  return uuidv4().replace(/-/g, "");
}

/** Return date N days from now as a Date object (midnight UTC) */
export function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Parse "HH:MM" into { hours, minutes } */
export function parseTime(t: string): { hours: number; minutes: number } {
  const [h, m] = t.split(":").map(Number);
  return { hours: h, minutes: m };
}

/** Generate time slots between startTime and endTime at durationMins intervals */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMins: number
): string[] {
  const slots: string[] = [];
  const { hours: sh, minutes: sm } = parseTime(startTime);
  const { hours: eh, minutes: em } = parseTime(endTime);

  let current = sh * 60 + sm;
  const end = eh * 60 + em;

  while (current + durationMins <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, "0");
    const m = (current % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    current += durationMins;
  }

  return slots;
}

/** Format a Date as YYYY-MM-DD */
export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}
