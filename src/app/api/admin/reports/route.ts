import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

// Get reports data
export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "overview"; // overview, branch, service, staff, customer, time
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const branchId = searchParams.get("branchId");
    const serviceId = searchParams.get("serviceId");
    const staffId = searchParams.get("staffId");

    // Default date range: last 30 days
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;
    end.setHours(23, 59, 59, 999);

    switch (reportType) {
      case "overview":
        return await getOverviewReport(start, end, branchId, serviceId);
      case "branch":
        return await getBranchReport(start, end, branchId);
      case "service":
        return await getServiceReport(start, end, serviceId);
      case "staff":
        return await getStaffReport(start, end, staffId);
      case "customer":
        return await getCustomerReport(start, end);
      case "time":
        return await getTimeReport(start, end, branchId);
      case "status":
        return await getStatusReport(start, end);
      default:
        return await getOverviewReport(start, end);
    }
  } catch (error) {
    console.error("Get reports error", error);
    return NextResponse.json(
      {
        error: "Failed to load reports",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// Overview Report - ภาพรวมทั้งหมด
async function getOverviewReport(start: Date, end: Date, branchId?: string | null, serviceId?: string | null) {
  const startDateStr = start.toISOString().split('T')[0];
  const endDateStr = end.toISOString().split('T')[0];

  // Total bookings
  let totalBookingsQuery = prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM booking b
    WHERE DATE(b.book_date) >= DATE(${startDateStr})
      AND DATE(b.book_date) <= DATE(${endDateStr})
  `;

  if (branchId) {
    const branchIdNum = parseInt(branchId);
    totalBookingsQuery = prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM booking b
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
        AND b.branch_id = ${branchIdNum}
    `;
  }

  if (serviceId) {
    const serviceIdNum = parseInt(serviceId);
    totalBookingsQuery = prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM booking b
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
        AND b.service_id = ${serviceIdNum}
    `;
  }

  if (branchId && serviceId) {
    const branchIdNum = parseInt(branchId);
    const serviceIdNum = parseInt(serviceId);
    totalBookingsQuery = prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM booking b
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
        AND b.branch_id = ${branchIdNum}
        AND b.service_id = ${serviceIdNum}
    `;
  }

  const totalBookings = await totalBookingsQuery;

  // Total revenue
  let totalRevenueQuery = prisma.$queryRaw<Array<{ total: number }>>`
    SELECT COALESCE(SUM(price), 0) as total
    FROM booking b
    WHERE DATE(b.book_date) >= DATE(${startDateStr})
      AND DATE(b.book_date) <= DATE(${endDateStr})
      AND price IS NOT NULL
  `;

  if (branchId) {
    const branchIdNum = parseInt(branchId);
    totalRevenueQuery = prisma.$queryRaw<Array<{ total: number }>>`
      SELECT COALESCE(SUM(price), 0) as total
      FROM booking b
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
        AND b.branch_id = ${branchIdNum}
        AND price IS NOT NULL
    `;
  }

  if (serviceId) {
    const serviceIdNum = parseInt(serviceId);
    totalRevenueQuery = prisma.$queryRaw<Array<{ total: number }>>`
      SELECT COALESCE(SUM(price), 0) as total
      FROM booking b
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
        AND b.service_id = ${serviceIdNum}
        AND price IS NOT NULL
    `;
  }

  if (branchId && serviceId) {
    const branchIdNum = parseInt(branchId);
    const serviceIdNum = parseInt(serviceId);
    totalRevenueQuery = prisma.$queryRaw<Array<{ total: number }>>`
      SELECT COALESCE(SUM(price), 0) as total
      FROM booking b
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
        AND b.branch_id = ${branchIdNum}
        AND b.service_id = ${serviceIdNum}
        AND price IS NOT NULL
    `;
  }

  const totalRevenue = await totalRevenueQuery;

  // Bookings by status
  let bookingsByStatusQuery = prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
    SELECT 
      COALESCE(status, 'pending') as status,
      COUNT(*) as count
    FROM booking b
    WHERE DATE(b.book_date) >= DATE(${startDateStr})
      AND DATE(b.book_date) <= DATE(${endDateStr})
    GROUP BY status
  `;

  if (branchId) {
    const branchIdNum = parseInt(branchId);
    bookingsByStatusQuery = prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
      SELECT 
        COALESCE(status, 'pending') as status,
        COUNT(*) as count
      FROM booking b
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
        AND b.branch_id = ${branchIdNum}
      GROUP BY status
    `;
  }

  if (serviceId) {
    const serviceIdNum = parseInt(serviceId);
    bookingsByStatusQuery = prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
      SELECT 
        COALESCE(status, 'pending') as status,
        COUNT(*) as count
      FROM booking b
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
        AND b.service_id = ${serviceIdNum}
      GROUP BY status
    `;
  }

  const bookingsByStatus = await bookingsByStatusQuery;

  // Bookings by day
  let bookingsByDayQuery = prisma.$queryRaw<Array<{ date: Date; count: bigint; revenue: number }>>`
    SELECT 
      DATE(b.book_date) as date,
      COUNT(*) as count,
      COALESCE(SUM(price), 0) as revenue
    FROM booking b
    WHERE DATE(b.book_date) >= DATE(${startDateStr})
      AND DATE(b.book_date) <= DATE(${endDateStr})
    GROUP BY DATE(b.book_date)
    ORDER BY date ASC
  `;

  if (branchId) {
    const branchIdNum = parseInt(branchId);
    bookingsByDayQuery = prisma.$queryRaw<Array<{ date: Date; count: bigint; revenue: number }>>`
      SELECT 
        DATE(b.book_date) as date,
        COUNT(*) as count,
        COALESCE(SUM(price), 0) as revenue
      FROM booking b
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
        AND b.branch_id = ${branchIdNum}
      GROUP BY DATE(b.book_date)
      ORDER BY date ASC
    `;
  }

  if (serviceId) {
    const serviceIdNum = parseInt(serviceId);
    bookingsByDayQuery = prisma.$queryRaw<Array<{ date: Date; count: bigint; revenue: number }>>`
      SELECT 
        DATE(b.book_date) as date,
        COUNT(*) as count,
        COALESCE(SUM(price), 0) as revenue
      FROM booking b
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
        AND b.service_id = ${serviceIdNum}
      GROUP BY DATE(b.book_date)
      ORDER BY date ASC
    `;
  }

  const bookingsByDay = await bookingsByDayQuery;

  // Top branches
  const topBranches = await prisma.$queryRaw<Array<{
    branch_id: number | null;
    branch_name: string | null;
    count: bigint;
    revenue: number;
  }>>`
    SELECT 
      b.branch_id,
      br.name as branch_name,
      COUNT(*) as count,
      COALESCE(SUM(b.price), 0) as revenue
    FROM booking b
    LEFT JOIN Branch br ON b.branch_id = br.id
    WHERE DATE(b.book_date) >= DATE(${startDateStr})
      AND DATE(b.book_date) <= DATE(${endDateStr})
    GROUP BY b.branch_id, br.name
    ORDER BY count DESC
    LIMIT 5
  `;

  // Top services
  const topServices = await prisma.$queryRaw<Array<{
    service_id: number | null;
    service_name: string | null;
    count: bigint;
    revenue: number;
  }>>`
    SELECT 
      b.service_id,
      s.name as service_name,
      COUNT(*) as count,
      COALESCE(SUM(b.price), 0) as revenue
    FROM booking b
    LEFT JOIN Service s ON b.service_id = s.id
    WHERE DATE(b.book_date) >= DATE(${startDateStr})
      AND DATE(b.book_date) <= DATE(${endDateStr})
    GROUP BY b.service_id, s.name
    ORDER BY count DESC
    LIMIT 5
  `;

  return NextResponse.json({
    reportType: "overview",
    period: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    },
    summary: {
      totalBookings: Number(totalBookings[0]?.count || 0),
      totalRevenue: Number(totalRevenue[0]?.total || 0),
    },
    bookingsByStatus: bookingsByStatus.map((item) => ({
      status: item.status || "pending",
      count: Number(item.count),
    })),
    bookingsByDay: bookingsByDay.map((item) => ({
      date: item.date instanceof Date ? item.date.toISOString().split('T')[0] : String(item.date).split('T')[0],
      count: Number(item.count),
      revenue: Number(item.revenue),
    })),
    topBranches: topBranches.map((item) => ({
      branchId: item.branch_id,
      branchName: item.branch_name || "ไม่ระบุ",
      count: Number(item.count),
      revenue: Number(item.revenue),
    })),
    topServices: topServices.map((item) => ({
      serviceId: item.service_id,
      serviceName: item.service_name || "ไม่ระบุ",
      count: Number(item.count),
      revenue: Number(item.revenue),
    })),
  });
}

// Branch Report - รายงานตามสาขา
async function getBranchReport(start: Date, end: Date, branchId?: string | null) {
  let whereClause = `
    WHERE b.book_date >= DATE(${start.toISOString().split('T')[0]})
      AND b.book_date <= DATE(${end.toISOString().split('T')[0]})
  `;

  if (branchId) {
    whereClause += ` AND b.branch_id = ${parseInt(branchId)}`;
  }

  const branchStats = await prisma.$queryRawUnsafe<Array<{
    branch_id: number | null;
    branch_name: string | null;
    total_bookings: bigint;
    total_revenue: number;
    pending: bigint;
    confirmed: bigint;
    completed: bigint;
    cancelled: bigint;
  }>>(`
    SELECT 
      b.branch_id,
      br.name as branch_name,
      COUNT(*) as total_bookings,
      COALESCE(SUM(b.price), 0) as total_revenue,
      SUM(CASE WHEN COALESCE(b.status, 'pending') = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
    FROM booking b
    LEFT JOIN Branch br ON b.branch_id = br.id
    ${whereClause}
    GROUP BY b.branch_id, br.name
    ORDER BY total_bookings DESC
  `);

  return NextResponse.json({
    reportType: "branch",
    period: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    },
    branches: branchStats.map((item) => ({
      branchId: item.branch_id,
      branchName: item.branch_name || "ไม่ระบุ",
      totalBookings: Number(item.total_bookings),
      totalRevenue: Number(item.total_revenue),
      pending: Number(item.pending),
      confirmed: Number(item.confirmed),
      completed: Number(item.completed),
      cancelled: Number(item.cancelled),
    })),
  });
}

// Service Report - รายงานตามบริการ
async function getServiceReport(start: Date, end: Date, serviceId?: string | null) {
  const startDateStr = start.toISOString().split('T')[0];
  const endDateStr = end.toISOString().split('T')[0];

  let serviceStats;

  if (serviceId) {
    const serviceIdNum = parseInt(serviceId);
    serviceStats = await prisma.$queryRaw<Array<{
      service_id: number | null;
      service_name: string | null;
      total_bookings: bigint;
      total_revenue: number;
      avg_price: number;
    }>>`
      SELECT 
        b.service_id,
        s.name as service_name,
        COUNT(*) as total_bookings,
        COALESCE(SUM(b.price), 0) as total_revenue,
        COALESCE(AVG(b.price), 0) as avg_price
      FROM booking b
      LEFT JOIN Service s ON b.service_id = s.id
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
        AND b.service_id = ${serviceIdNum}
      GROUP BY b.service_id, s.name
      ORDER BY total_bookings DESC
    `;
  } else {
    serviceStats = await prisma.$queryRaw<Array<{
      service_id: number | null;
      service_name: string | null;
      total_bookings: bigint;
      total_revenue: number;
      avg_price: number;
    }>>`
      SELECT 
        b.service_id,
        s.name as service_name,
        COUNT(*) as total_bookings,
        COALESCE(SUM(b.price), 0) as total_revenue,
        COALESCE(AVG(b.price), 0) as avg_price
      FROM booking b
      LEFT JOIN Service s ON b.service_id = s.id
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
      GROUP BY b.service_id, s.name
      ORDER BY total_bookings DESC
    `;
  }

  return NextResponse.json({
    reportType: "service",
    period: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    },
    services: serviceStats.map((item) => ({
      serviceId: item.service_id,
      serviceName: item.service_name || "ไม่ระบุ",
      totalBookings: Number(item.total_bookings),
      totalRevenue: Number(item.total_revenue),
      avgPrice: Number(item.avg_price),
    })),
  });
}

// Staff Report - รายงานตามพนักงาน
async function getStaffReport(start: Date, end: Date, staffId?: string | null) {
  const startDateStr = start.toISOString().split('T')[0];
  const endDateStr = end.toISOString().split('T')[0];

  let staffStats;

  if (staffId) {
    const staffIdNum = parseInt(staffId);
    staffStats = await prisma.$queryRaw<Array<{
      emp_id: number;
      employee_name: string;
      total_bookings: bigint;
      total_revenue: number;
      completed: bigint;
    }>>`
      SELECT 
        b.emp_id,
        CONCAT(COALESCE(e.prename, ''), COALESCE(e.fname, ''), ' ', COALESCE(e.lname, '')) as employee_name,
        COUNT(*) as total_bookings,
        COALESCE(SUM(b.price), 0) as total_revenue,
        SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM booking b
      LEFT JOIN employee e ON b.emp_id = e.id
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
        AND b.emp_id = ${staffIdNum}
      GROUP BY b.emp_id, e.prename, e.fname, e.lname
      ORDER BY total_bookings DESC
    `;
  } else {
    staffStats = await prisma.$queryRaw<Array<{
      emp_id: number;
      employee_name: string;
      total_bookings: bigint;
      total_revenue: number;
      completed: bigint;
    }>>`
      SELECT 
        b.emp_id,
        CONCAT(COALESCE(e.prename, ''), COALESCE(e.fname, ''), ' ', COALESCE(e.lname, '')) as employee_name,
        COUNT(*) as total_bookings,
        COALESCE(SUM(b.price), 0) as total_revenue,
        SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM booking b
      LEFT JOIN employee e ON b.emp_id = e.id
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
      GROUP BY b.emp_id, e.prename, e.fname, e.lname
      ORDER BY total_bookings DESC
    `;
  }

  return NextResponse.json({
    reportType: "staff",
    period: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    },
    staff: staffStats.map((item) => ({
      staffId: item.emp_id,
      staffName: item.employee_name || "ไม่ระบุ",
      totalBookings: Number(item.total_bookings),
      totalRevenue: Number(item.total_revenue),
      completed: Number(item.completed),
    })),
  });
}

// Customer Report - รายงานลูกค้า
async function getCustomerReport(start: Date, end: Date) {
  const startDateStr = start.toISOString().split('T')[0];
  const endDateStr = end.toISOString().split('T')[0];

  const customerStats = await prisma.$queryRaw<Array<{
    booker_name: string;
    booker_tel: string;
    line_id: string | null;
    total_bookings: bigint;
    total_revenue: number;
    last_booking_date: Date;
  }>>`
    SELECT 
      b.booker_name,
      b.booker_tel,
      b.line_id,
      COUNT(*) as total_bookings,
      COALESCE(SUM(b.price), 0) as total_revenue,
      MAX(b.book_date) as last_booking_date
    FROM booking b
    WHERE DATE(b.book_date) >= DATE(${startDateStr})
      AND DATE(b.book_date) <= DATE(${endDateStr})
    GROUP BY b.booker_name, b.booker_tel, b.line_id
    ORDER BY total_bookings DESC
    LIMIT 50
  `;

  return NextResponse.json({
    reportType: "customer",
    period: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    },
    customers: customerStats.map((item) => ({
      name: item.booker_name,
      phone: item.booker_tel,
      lineId: item.line_id,
      totalBookings: Number(item.total_bookings),
      totalRevenue: Number(item.total_revenue),
      lastBookingDate: item.last_booking_date instanceof Date
        ? item.last_booking_date.toISOString().split('T')[0]
        : String(item.last_booking_date).split('T')[0],
    })),
  });
}

// Time Report - รายงานตามเวลา
async function getTimeReport(start: Date, end: Date, branchId?: string | null) {
  const startDateStr = start.toISOString().split('T')[0];
  const endDateStr = end.toISOString().split('T')[0];

  let bookingsByHour;
  let bookingsByDayOfWeek;

  if (branchId) {
    const branchIdNum = parseInt(branchId);
    bookingsByHour = await prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
      SELECT 
        HOUR(STR_TO_DATE(b.book_time, '%H:%i')) as hour,
        COUNT(*) as count
      FROM booking b
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
        AND b.branch_id = ${branchIdNum}
        AND b.book_time IS NOT NULL
        AND b.book_time != ''
      GROUP BY HOUR(STR_TO_DATE(b.book_time, '%H:%i'))
      ORDER BY hour ASC
    `;

    bookingsByDayOfWeek = await prisma.$queryRaw<Array<{ day_of_week: number; count: bigint }>>`
      SELECT 
        DAYOFWEEK(b.book_date) as day_of_week,
        COUNT(*) as count
      FROM booking b
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
        AND b.branch_id = ${branchIdNum}
      GROUP BY DAYOFWEEK(b.book_date)
      ORDER BY day_of_week ASC
    `;
  } else {
    bookingsByHour = await prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
      SELECT 
        HOUR(STR_TO_DATE(b.book_time, '%H:%i')) as hour,
        COUNT(*) as count
      FROM booking b
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
        AND b.book_time IS NOT NULL
        AND b.book_time != ''
      GROUP BY HOUR(STR_TO_DATE(b.book_time, '%H:%i'))
      ORDER BY hour ASC
    `;

    bookingsByDayOfWeek = await prisma.$queryRaw<Array<{ day_of_week: number; count: bigint }>>`
      SELECT 
        DAYOFWEEK(b.book_date) as day_of_week,
        COUNT(*) as count
      FROM booking b
      WHERE DATE(b.book_date) >= DATE(${startDateStr})
        AND DATE(b.book_date) <= DATE(${endDateStr})
      GROUP BY DAYOFWEEK(b.book_date)
      ORDER BY day_of_week ASC
    `;
  }

  return NextResponse.json({
    reportType: "time",
    period: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    },
    bookingsByHour: bookingsByHour.map((item) => ({
      hour: Number(item.hour),
      count: Number(item.count),
    })),
    bookingsByDayOfWeek: bookingsByDayOfWeek.map((item) => ({
      dayOfWeek: Number(item.day_of_week),
      count: Number(item.count),
    })),
  });
}

// Status Report - รายงานสถานะการจอง
async function getStatusReport(start: Date, end: Date) {
  const startDateStr = start.toISOString().split('T')[0];
  const endDateStr = end.toISOString().split('T')[0];

  const statusStats = await prisma.$queryRaw<Array<{
    status: string;
    count: bigint;
    revenue: number;
  }>>`
    SELECT 
      COALESCE(status, 'pending') as status,
      COUNT(*) as count,
      COALESCE(SUM(price), 0) as revenue
    FROM booking b
    WHERE DATE(b.book_date) >= DATE(${startDateStr})
      AND DATE(b.book_date) <= DATE(${endDateStr})
    GROUP BY status
    ORDER BY count DESC
  `;

  return NextResponse.json({
    reportType: "status",
    period: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    },
    statuses: statusStats.map((item) => ({
      status: item.status || "pending",
      count: Number(item.count),
      revenue: Number(item.revenue),
    })),
  });
}

