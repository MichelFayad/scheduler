import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Creates a booking with a unique, monotonic reference number (SCH-YYYY-NNNNN).
 *
 * The number is derived from the highest existing reference for the current year
 * rather than a row count — a count collides under concurrency and after a
 * booking is deleted. On the rare race where two requests pick the same number,
 * the unique constraint (P2002) trips and we retry with the new max.
 *
 * Shared by the public booking form and the admin "manual booking" flow.
 */
export async function createBookingWithReference(
  data: Omit<Prisma.BookingUncheckedCreateInput, "referenceNumber">
) {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 5; attempt++) {
    const last = await prisma.booking.findFirst({
      where: { referenceNumber: { startsWith: `SCH-${year}-` } },
      orderBy: { referenceNumber: "desc" },
      select: { referenceNumber: true },
    });
    const lastNum = last ? parseInt(last.referenceNumber.split("-").pop() ?? "0", 10) || 0 : 0;
    const referenceNumber = `SCH-${year}-${String(lastNum + 1).padStart(5, "0")}`;

    try {
      return await prisma.booking.create({ data: { ...data, referenceNumber } });
    } catch (e) {
      // P2002 = unique-constraint violation (another request took this reference).
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt < 4) {
        continue;
      }
      throw e;
    }
  }

  throw new Error("Could not generate a unique booking reference after multiple attempts");
}
