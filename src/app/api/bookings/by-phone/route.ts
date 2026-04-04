import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone") || "";

    const normalized = phone.replace(/\D/g, "");
    if (!normalized) {
      return NextResponse.json(
        { error: "Phone is required" },
        { status: 400 }
      );
    }

    // Match exact phone or with hyphens
    const rows = await prisma.$queryRaw<Array<{
      id: number;
      book_date: Date;
      book_time: string | null;
      booker_tel: string | null;
      booker_name: string | null;
      status: string | null;
      confirm_datetime: Date | null;
      staff_name: string | null;
      branch_name: string | null;
      service_name: string | null;
    }>>`
      SELECT 
        b.id,
        b.book_date,
        b.book_time,
        b.booker_tel,
        b.booker_name,
        b.status,
        b.confirm_datetime,
        CONCAT(COALESCE(e.prename, ''), COALESCE(e.fname, ''), ' ', COALESCE(e.lname, '')) as staff_name,
        br.name as branch_name,
        s.name as service_name
      FROM booking b
      LEFT JOIN employee e ON b.emp_id = e.id
      LEFT JOIN Branch br ON b.branch_id = br.id
      LEFT JOIN Service s ON b.service_id = s.id
      WHERE REPLACE(b.booker_tel, '-', '') = ${normalized}
      ORDER BY b.book_date DESC, b.book_time DESC, b.id DESC
      LIMIT 200
    `;

    const bookings = rows.map((r) => ({
      id: String(r.id),
      date: r.book_date instanceof Date ? r.book_date.toISOString().split("T")[0] : String(r.book_date),
      time: r.book_time || "-",
      customerName: r.booker_name || "-",
      customerPhone: r.booker_tel || "-",
      staffName: (r.staff_name || "-").trim(),
      branchName: r.branch_name || "-",
      serviceName: r.service_name || "-",
      status: r.status || "pending",
      confirmedAt: r.confirm_datetime ? (r.confirm_datetime instanceof Date ? r.confirm_datetime.toISOString() : String(r.confirm_datetime)) : null,
    }));

    return NextResponse.json({ bookings });
  } catch (error: any) {
    console.error("[bookings/by-phone] error", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings", details: error.message },
      { status: 500 }
    );
  }
}





