import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total counts
    const [
      totalBranches,
      totalServices,
      totalStaff,
      todayBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
    ] = await Promise.all([
      // Total branches (active only)
      prisma.branch.count({
        where: {
          is_active: "yes",
        },
      }),
      // Total services
      prisma.service.count(),
      // Total active staff
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM employee
        WHERE is_active = 'yes'
      `,
      // Today's bookings
      prisma.booking.count({
        where: {
          bookDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      // Pending bookings
      prisma.booking.count({
        where: {
          status: "pending",
        },
      }),
      // Confirmed bookings
      prisma.booking.count({
        where: {
          status: "confirmed",
        },
      }),
      // Completed bookings
      prisma.booking.count({
        where: {
          status: "completed",
        },
      }),
      // Cancelled bookings
      prisma.booking.count({
        where: {
          status: "cancelled",
        },
      }),
    ]);

    // Get today's revenue
    const todayRevenueResult = await prisma.$queryRaw<Array<{ total: number }>>`
      SELECT COALESCE(SUM(price), 0) as total
      FROM booking
      WHERE book_date >= ${today}
        AND book_date < ${tomorrow}
        AND price IS NOT NULL
    `;
    const todayRevenue = todayRevenueResult[0]?.total || 0;

    // Get monthly revenue (current month)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyRevenueResult = await prisma.$queryRaw<Array<{ total: number }>>`
      SELECT COALESCE(SUM(price), 0) as total
      FROM booking
      WHERE book_date >= ${startOfMonth}
        AND book_date < ${tomorrow}
        AND price IS NOT NULL
    `;
    const monthlyRevenue = monthlyRevenueResult[0]?.total || 0;

    // Get bookings by status for today
    const todayBookingsByStatus = await prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
      SELECT 
        COALESCE(status, 'pending') as status,
        COUNT(*) as count
      FROM booking
      WHERE book_date >= ${today}
        AND book_date < ${tomorrow}
      GROUP BY status
    `;

    // Get recent bookings (last 10)
    const recentBookings = await prisma.$queryRaw<Array<{
      id: number;
      booker_name: string;
      booker_tel: string;
      book_date: Date;
      book_time: string | null;
      status: string | null;
      branch_name: string | null;
      service_name: string | null;
    }>>`
      SELECT 
        b.id,
        b.booker_name,
        b.booker_tel,
        b.book_date,
        b.book_time,
        b.status,
        br.name as branch_name,
        s.name as service_name
      FROM booking b
      LEFT JOIN Branch br ON b.branch_id = br.id
      LEFT JOIN Service s ON b.service_id = s.id
      ORDER BY b.book_date DESC, b.id DESC
      LIMIT 10
    `;

    // Get bookings by branch (for today)
    const bookingsByBranch = await prisma.$queryRaw<Array<{
      branch_id: number | null;
      branch_name: string | null;
      count: bigint;
    }>>`
      SELECT 
        b.branch_id,
        br.name as branch_name,
        COUNT(*) as count
      FROM booking b
      LEFT JOIN Branch br ON b.branch_id = br.id
      WHERE b.book_date >= ${today}
        AND b.book_date < ${tomorrow}
      GROUP BY b.branch_id, br.name
      ORDER BY count DESC
      LIMIT 5
    `;

    // Get staff on duty today (simplified - count active staff)
    const staffOnDuty = Number(totalStaff[0]?.count || 0);

    return NextResponse.json({
      stats: {
        totalBranches,
        totalServices,
        totalStaff: staffOnDuty,
        todayBookings,
        pendingBookings,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
        todayRevenue: Number(todayRevenue),
        monthlyRevenue: Number(monthlyRevenue),
      },
      todayBookingsByStatus: todayBookingsByStatus.map((item) => ({
        status: item.status || "pending",
        count: Number(item.count),
      })),
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        bookerName: b.booker_name,
        bookerTel: b.booker_tel,
        bookDate: b.book_date instanceof Date ? b.book_date.toISOString().split('T')[0] : String(b.book_date).split('T')[0],
        bookTime: b.book_time || "ไม่ระบุ",
        status: b.status || "pending",
        branchName: b.branch_name || "ไม่ระบุ",
        serviceName: b.service_name || "ไม่ระบุ",
      })),
      bookingsByBranch: bookingsByBranch.map((item) => ({
        branchId: item.branch_id,
        branchName: item.branch_name || "ไม่ระบุ",
        count: Number(item.count),
      })),
    });
  } catch (error) {
    console.error("Admin dashboard GET error", error);
    return NextResponse.json(
      {
        error: "Failed to load dashboard data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

