import { NextRequest, NextResponse } from "next/server";
import { getAvailableDatesInMonth, getAvailableSlots } from "@/lib/availability";

// GET /api/availability?communityId=xxx&year=2026&month=6
// GET /api/availability?communityId=xxx&date=2026-06-20
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const communityId = searchParams.get("communityId");

  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  // Slot-level query for a specific date
  const date = searchParams.get("date");
  if (date) {
    const slots = await getAvailableSlots(communityId, date);
    return NextResponse.json(slots);
  }

  // Month-level query for calendar
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);
  const dates = await getAvailableDatesInMonth(communityId, year, month);
  return NextResponse.json(dates);
}
