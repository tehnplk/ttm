import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Get shop configuration
export async function GET() {
  try {
    // Note: ShopConfig model is not available in the current database schema
    // Get holidays from choliday table
    const holidays = await prisma.$queryRaw<Array<{ hdate: Date }>>`
      SELECT hdate
      FROM choliday
      WHERE hdate >= CURDATE()
      ORDER BY hdate ASC
    `;

    const holidayDates = holidays.map((h) => {
      const date = h.hdate instanceof Date ? h.hdate : new Date(h.hdate);
      return date.toISOString().split('T')[0];
    });

    // Return default values with holidays from database
    return NextResponse.json({
      openTime: 10,
      closeTime: 20,
      holidays: holidayDates,
      slotInterval: 60,
    });
  } catch (error) {
    console.error("Config GET error", error);
    // Return default values on error
    return NextResponse.json({
      openTime: 10,
      closeTime: 20,
      holidays: [],
      slotInterval: 60,
    });
  }
}

