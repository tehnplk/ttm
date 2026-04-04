import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Get schedule for a specific staff member (using Employee model from ttm.sql)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId");

    if (!staffId) {
      return NextResponse.json(
        { error: "staffId is required" },
        { status: 400 },
      );
    }

    const employeeId = parseInt(staffId);
    if (isNaN(employeeId)) {
      return NextResponse.json(
        { error: "Invalid staffId" },
        { status: 400 },
      );
    }

    // Get stop dates for this employee
    const stopDates = await prisma.$queryRaw<Array<{ stop_date: Date }>>`
      SELECT stop_date
      FROM emp_stop_date
      WHERE emp_id = ${employeeId}
    `;

    // Get work times for this employee
    const workTimes = await prisma.$queryRaw<Array<{
      work_date: Date;
      begin_time: Date;
      is_active: string;
    }>>`
      SELECT work_date, begin_time, is_active
      FROM cwork_time
      WHERE emp_id = ${employeeId}
        AND is_active = 'yes'
    `;

    // Convert stop dates to ISO strings
    const offDays = stopDates.map((d) => {
      const date = d.stop_date instanceof Date ? d.stop_date : new Date(d.stop_date);
      return date.toISOString().split('T')[0];
    });

    // Build busy slots from work times
    const busySlots: { [date: string]: string[] } = {};
    workTimes.forEach((wt) => {
      const date = wt.work_date instanceof Date ? wt.work_date : new Date(wt.work_date);
      const dateStr = date.toISOString().split('T')[0];
      if (!busySlots[dateStr]) {
        busySlots[dateStr] = [];
      }
      // Convert time to string format (HH:MM)
      if (wt.begin_time) {
        const time = wt.begin_time instanceof Date ? wt.begin_time : new Date(wt.begin_time);
        const timeStr = time.toTimeString().slice(0, 5);
        if (!busySlots[dateStr].includes(timeStr)) {
          busySlots[dateStr].push(timeStr);
        }
      }
    });

    return NextResponse.json({
      staffId,
      offDays,
      busySlots,
    });
  } catch (error) {
    console.error("Schedule GET error", error);
    return NextResponse.json(
      { error: "Failed to load schedule", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

