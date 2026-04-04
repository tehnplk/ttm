import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId");
    const date = searchParams.get("date");

    if (!staffId || !date) {
      return NextResponse.json(
        { error: "staffId and date are required" },
        { status: 400 }
      );
    }

    // Normalize date to YYYY-MM-DD
    let dateStr = date;
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      dateStr = `${match[1]}-${match[2]}-${match[3]}`;
    } else {
      dateStr = date.split("T")[0];
    }

    const rows = await prisma.$queryRaw<Array<{
      id: number;
      booker_name: string | null;
      booker_tel: string | null;
      book_time: string | null;
      status: string | null;
      service_name: string | null;
    }>>`
      SELECT 
        b.id,
        b.booker_name,
        b.booker_tel,
        b.book_time,
        b.status,
        s.name as service_name
      FROM booking b
      LEFT JOIN Service s ON b.service_id = s.id
      WHERE b.emp_id = ${Number(staffId)}
        AND DATE(b.book_date) = ${dateStr}
        AND (b.status IS NULL OR b.status IN ('pending','confirmed','completed'))
      ORDER BY b.book_time ASC
    `;

    const bookings = rows.map((r) => ({
      id: String(r.id),
      customerName: r.booker_name || "-",
      customerPhone: r.booker_tel || "-",
      time: r.book_time || "-",
      serviceName: r.service_name || "-",
      status: r.status || "pending",
    }));

    return NextResponse.json({ bookings });
  } catch (error: any) {
    console.error("[staff-bookings] error", error);
    return NextResponse.json(
      { error: "Failed to load staff bookings", details: error.message },
      { status: 500 }
    );
  }
}





