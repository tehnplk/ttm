import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public API for booking - Get opening hours for a branch
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

    const res = NextResponse.json({
      timeSlots: hours.map((h) => ({
        id: h.id,
        branchId: h.branch_id,
        startTime: h.start_time,
        endTime: h.end_time,
      })),
    });
    res.headers.set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
    res.headers.set("Pragma", "no-cache");
    return res;
  } catch (error: any) {
    // If table doesn't exist, return empty array
    if (error.message?.includes("doesn't exist")) {
      return NextResponse.json({ timeSlots: [] });
    }
    console.error("Opening hours GET error", error);
    return NextResponse.json(
      { error: "Failed to load opening hours" },
      { status: 500 },
    );
  }
}








