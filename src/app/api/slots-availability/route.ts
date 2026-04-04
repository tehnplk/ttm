import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ป้องกัน cache บน server/CDN – ข้อมูลจำนวนคนว่างต้อง real-time
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Get available staff count per time slot for a branch and date
// Used by TimeSelection to show "ว่าง N คน" on each slot button
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const date = searchParams.get("date");

    if (!branchId || !date) {
      return NextResponse.json(
        { error: "branchId and date are required" },
        { status: 400 }
      );
    }

    const branchIdNum = parseInt(branchId);
    if (isNaN(branchIdNum)) {
      return NextResponse.json(
        { error: "Invalid branchId" },
        { status: 400 }
      );
    }

    // Normalize date to YYYY-MM-DD
    let dateStr: string;
    const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      dateStr = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    } else {
      dateStr = date.split("T")[0];
    }

    // 1. Get opening hours for branch
    const hours = await prisma.$queryRaw<Array<{
      start_time: string;
      end_time: string;
    }>>`
      SELECT start_time, end_time
      FROM opening_hours
      WHERE branch_id = ${branchId}
      ORDER BY start_time ASC
    `;

    if (!hours || hours.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    const timeSlots = hours.map((h) => ({
      time: `${h.start_time} - ${h.end_time}`,
      startTime: h.start_time,
      endTime: h.end_time,
    }));

    // 2. Get all staff for branch
    let employees: Array<{ id: number; branch_id: number | null }>;
    try {
      employees = await prisma.$queryRaw<Array<{ id: number; branch_id: number | null }>>`
        SELECT id, COALESCE(branch_id, NULL) as branch_id
        FROM employee
        WHERE is_active = 'yes'
      `;
    } catch (err: any) {
      if (err.message?.includes("branch_id") || err.message?.includes("Unknown column")) {
        employees = await prisma.$queryRaw<Array<{ id: number; branch_id: number | null }>>`
          SELECT id, NULL as branch_id
          FROM employee
          WHERE is_active = 'yes'
        `;
      } else {
        throw err;
      }
    }

    const branchStaffIds = new Set(
      employees
        .filter((e) => e.branch_id === null || e.branch_id === branchIdNum)
        .map((e) => String(e.id))
    );
    const totalStaff = branchStaffIds.size;

    // 3. Holiday staff for this date and branch
    let holidayStaffIds: Set<string> = new Set();
    try {
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        const holidays = await prisma.staffHoliday.findMany({
          where: { holidayDate: dateObj, branchId: branchIdNum },
        });
        holidayStaffIds = new Set(holidays.map((h) => h.staffId));
      }
    } catch {
      // ignore
    }

    // 4. For each time slot, count unavailable (off + booked) and return available count
    const slotsWithCount: Array<{ time: string; availableCount: number }> = [];

    for (const slot of timeSlots) {
      const timeStr = slot.time;
      const startTime = slot.startTime;
      const endTime = slot.endTime;

      let offStaffIds: Set<string> = new Set();
      let bookedStaffIds: Set<string> = new Set();

      const offBookings = await prisma.$queryRaw<Array<{ emp_id: number }>>`
        SELECT emp_id
        FROM booking
        WHERE DATE(book_date) = ${dateStr}
          AND UPPER(TRIM(booker_name)) = 'OFF'
          AND (
            book_time = ${timeStr}
            OR book_time = ${`${startTime} - ${endTime}`}
            OR book_time = ${`${startTime}-${endTime}`}
            OR (${endTime} != '' AND book_time LIKE ${`t-%-${startTime}-${endTime}`})
            OR (${startTime} != '' AND (
              book_time = ${startTime}
              OR book_time LIKE ${`${startTime} - %`}
              OR book_time LIKE ${`${startTime}-%`}
              OR book_time LIKE ${`t-%-${startTime}-%`}
            ))
          )
          AND (status IS NULL OR status IN ('pending','confirmed','completed'))
      `;
      offBookings.forEach((b) => offStaffIds.add(String(b.emp_id)));

      const existingBookings = await prisma.$queryRaw<Array<{ emp_id: number }>>`
        SELECT emp_id
        FROM booking
        WHERE DATE(book_date) = ${dateStr}
          AND UPPER(TRIM(booker_name)) != 'OFF'
          AND (
            book_time = ${timeStr}
            OR book_time = ${`${startTime} - ${endTime}`}
            OR book_time = ${`${startTime}-${endTime}`}
            OR (${endTime} != '' AND book_time LIKE ${`t-%-${startTime}-${endTime}`})
            OR (${startTime} != '' AND (
              book_time = ${startTime}
              OR book_time LIKE ${`${startTime} - %`}
              OR book_time LIKE ${`${startTime}-%`}
              OR book_time LIKE ${`t-%-${startTime}-%`}
            ))
          )
          AND (status IS NULL OR status IN ('pending','confirmed','completed'))
      `;
      existingBookings.forEach((b) => bookedStaffIds.add(String(b.emp_id)));

      const unavailable = new Set([
        ...Array.from(holidayStaffIds).filter((id) => branchStaffIds.has(id)),
        ...Array.from(offStaffIds).filter((id) => branchStaffIds.has(id)),
        ...Array.from(bookedStaffIds).filter((id) => branchStaffIds.has(id)),
      ]);
      const availableCount = totalStaff - unavailable.size;

      slotsWithCount.push({
        time: timeStr,
        availableCount: Math.max(0, availableCount),
      });
    }

    const res = NextResponse.json({ slots: slotsWithCount });
    res.headers.set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
    res.headers.set("Pragma", "no-cache");
    return res;
  } catch (error: any) {
    console.error("[slots-availability] error", error);
    return NextResponse.json(
      {
        error: "Failed to load slots availability",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
