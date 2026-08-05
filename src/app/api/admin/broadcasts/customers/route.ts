import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

const MAX_RESULTS = 20;

// Search customers by name to pick a single LINE recipient for a test send
export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim();

    if (query.length < 2) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร" },
        { status: 400 },
      );
    }

    // One row per LINE user, taken from their newest booking so the name and
    // phone shown are the most recent ones on file
    const customers = await prisma.$queryRaw<Array<{
      lineId: string;
      name: string | null;
      phone: string | null;
      lastBookDate: Date | null;
    }>>`
      SELECT
        b.line_id as lineId,
        b.booker_name as name,
        b.booker_tel as phone,
        b.book_date as lastBookDate
      FROM booking b
      INNER JOIN (
        SELECT line_id, MAX(id) AS max_id
        FROM booking
        WHERE line_id IS NOT NULL
          AND line_id != ''
          AND booker_name LIKE ${`%${query}%`}
        GROUP BY line_id
      ) latest ON latest.max_id = b.id
      ORDER BY b.booker_name ASC
      LIMIT ${MAX_RESULTS}
    `;

    return NextResponse.json({
      customers: customers.map((customer) => ({
        lineId: customer.lineId,
        name: customer.name || "ไม่ระบุชื่อ",
        phone: customer.phone || "",
        lastBookDate: customer.lastBookDate
          ? (customer.lastBookDate instanceof Date
            ? customer.lastBookDate.toISOString().split("T")[0]
            : new Date(customer.lastBookDate).toISOString().split("T")[0])
          : null,
      })),
      total: customers.length,
      limited: customers.length === MAX_RESULTS,
    });
  } catch (error) {
    console.error("Search broadcast customers error", error);
    return NextResponse.json(
      {
        error: "Failed to search customers",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
