import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export interface NotifiableBooking {
  id: number;
  booker_name: string;
  booker_tel: string;
  book_date: Date;
  book_time: string | null;
  line_id: string | null;
  branch_name: string | null;
  service_name: string | null;
  employee_name: string | null;
  booking_id: string | null;
  status: string | null;
}

/**
 * Target booking date for a notification run (today + daysBefore + 1)
 *
 * NOTE: the extra +1 is the existing production behaviour — with daysBefore = 1
 * the run targets bookings 2 days out, not tomorrow. Kept as-is so the preview
 * list in the admin UI matches exactly what the scheduled run would send.
 */
export function resolveTargetDate(daysBefore: number): Date {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysBefore);
  targetDate.setHours(0, 0, 0, 0);

  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay;
}

/**
 * A real LINE user id is "U" followed by 32 hex characters.
 * Older test rows hold values like "22" or "test123" - a push to those always fails.
 */
export function isValidLineId(lineId: string | null): boolean {
  return !!lineId && /^U[0-9a-f]{32}$/i.test(lineId.trim());
}

/**
 * Partially hidden LINE id for display in the admin UI
 */
export function maskLineId(lineId: string | null): string | null {
  const id = lineId?.trim();
  if (!id) return null;
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

/**
 * Customers eligible for notification: real customer rows (not staff "OFF"
 * blocks) that have a LINE ID and are not cancelled.
 * Pass bookingId to narrow to a single booking (used by the test send).
 */
export async function fetchNotifiableBookings(options: {
  daysBefore: number;
  bookingId?: number;
}): Promise<NotifiableBooking[]> {
  const { daysBefore, bookingId } = options;

  const scope = bookingId
    ? Prisma.sql`b.id = ${bookingId}`
    : Prisma.sql`DATE(b.book_date) = DATE(${resolveTargetDate(daysBefore)})`;

  return prisma.$queryRaw<NotifiableBooking[]>`
    SELECT
      b.id,
      b.booker_name,
      b.booker_tel,
      b.book_date,
      b.book_time,
      b.line_id,
      br.name as branch_name,
      s.name as service_name,
      CONCAT(COALESCE(e.prename, ''), COALESCE(e.fname, ''), ' ', COALESCE(e.lname, '')) as employee_name,
      COALESCE(b.booking_id, CONCAT('BK-', LPAD(b.id, 6, '0'))) as booking_id,
      b.status
    FROM booking b
    LEFT JOIN Branch br ON b.branch_id = br.id
    LEFT JOIN Service s ON b.service_id = s.id
    LEFT JOIN employee e ON b.emp_id = e.id
    WHERE ${scope}
      AND b.line_id IS NOT NULL
      AND TRIM(b.line_id) != ''
      AND UPPER(TRIM(b.booker_name)) != 'OFF'
      AND (b.status IS NULL OR b.status = 'pending' OR b.status = 'confirmed')
    ORDER BY b.book_time ASC
  `;
}

/**
 * Thai-formatted booking date (Buddhist era via th-TH locale)
 */
export function formatBookingDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Readable time range from a stored slot value
 * "t-1-10:30-12:30" -> "10:30 - 12:30"
 */
export function formatBookingTime(bookTime: string | null): string {
  const timeStr = bookTime || "ไม่ระบุ";
  if (timeStr.startsWith("t-")) {
    const parts = timeStr.split("-");
    if (parts.length >= 4) {
      return `${parts[2]} - ${parts[3]}`;
    }
  }
  return timeStr;
}
