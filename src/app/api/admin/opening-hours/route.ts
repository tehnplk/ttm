import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Get time slots
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    if (!branchId) {
      return NextResponse.json({ timeSlots: [] });
    }

    // Use raw query to fetch from opening_hours table
    const hours = await prisma.$queryRaw<Array<{
      id: number;
      branch_id: string;
      start_time: string;
      end_time: string;
    }>>`
      SELECT id, branch_id, start_time, end_time
      FROM opening_hours
      WHERE branch_id = ${branchId}
      ORDER BY start_time ASC
    `;

    return NextResponse.json({
      timeSlots: hours.map((h) => ({
        id: h.id,
        branchId: h.branch_id,
        startTime: h.start_time,
        endTime: h.end_time,
      })),
    });
  } catch (error: any) {
    // If table doesn't exist, return empty array
    if (error.message?.includes("doesn't exist")) {
      return NextResponse.json({ timeSlots: [] });
    }
    console.error("Admin opening hours GET error", error);
    return NextResponse.json(
      { error: "Failed to load opening hours" },
      { status: 500 },
    );
  }
}

// Save time slots
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { timeSlots, branchId } = body;

    if (!branchId) {
      return NextResponse.json(
        { error: "กรุณาเลือกสาขา" },
        { status: 400 },
      );
    }

    if (!Array.isArray(timeSlots)) {
      return NextResponse.json(
        { error: "Invalid time slots data" },
        { status: 400 },
      );
    }

    // Delete all existing records for this branch
    await prisma.$executeRaw`
      DELETE FROM opening_hours WHERE branch_id = ${branchId}
    `;

    // Insert new records
    for (const slot of timeSlots) {
      await prisma.$executeRaw`
        INSERT INTO opening_hours (branch_id, start_time, end_time)
        VALUES (${branchId}, ${slot.startTime}, ${slot.endTime})
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin opening hours POST error", error);
    return NextResponse.json(
      {
        error: "Failed to save opening hours",
        details: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}
