import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

// Get booking delete logs
export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const deletedBy = searchParams.get("deletedBy");

    let whereClause = "";
    const params: any[] = [];
    let paramIndex = 1;

    if (deletedBy) {
      whereClause += ` WHERE deleted_by = ?`;
      params.push(deletedBy);
      paramIndex++;
    }

    // Use raw SQL query (in case Prisma model is not yet generated)
    let logsQuery = `
      SELECT 
        id,
        booking_id as bookingId,
        customer_name as customerName,
        customer_phone as customerPhone,
        line_id as lineId,
        book_date as bookDate,
        book_time as bookTime,
        staff_id as staffId,
        staff_name as staffName,
        branch_id as branchId,
        branch_name as branchName,
        service_id as serviceId,
        service_name as serviceName,
        deleted_by as deletedBy,
        deleted_at as deletedAt
      FROM booking_delete_log
    `;
    
    if (deletedBy) {
      logsQuery += ` WHERE deleted_by = ?`;
    }
    
    logsQuery += ` ORDER BY deleted_at DESC LIMIT ? OFFSET ?`;
    
    const logsParams: any[] = [];
    if (deletedBy) {
      logsParams.push(deletedBy);
    }
    logsParams.push(limit, offset);
    
    const logs = await prisma.$queryRawUnsafe<any[]>(logsQuery, ...logsParams);

    let countQuery = `SELECT COUNT(*) as count FROM booking_delete_log`;
    const countParams: any[] = [];
    if (deletedBy) {
      countQuery += ` WHERE deleted_by = ?`;
      countParams.push(deletedBy);
    }
    
    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(countQuery, ...countParams);

    const total = Number(countResult[0]?.count || 0);

    return NextResponse.json({
      logs: logs.map((log: any) => ({
        id: log.id,
        bookingId: log.bookingId,
        customerName: log.customerName,
        customerPhone: log.customerPhone,
        lineId: log.lineId,
        bookDate: log.bookDate ? new Date(log.bookDate).toISOString().split('T')[0] : null,
        bookTime: log.bookTime,
        staffId: log.staffId,
        staffName: log.staffName,
        branchId: log.branchId,
        branchName: log.branchName,
        serviceId: log.serviceId,
        serviceName: log.serviceName,
        deletedBy: log.deletedBy,
        deletedAt: log.deletedAt ? new Date(log.deletedAt).toISOString() : null,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to fetch booking delete logs", error);
    
    // If table doesn't exist, return empty result
    if (error instanceof Error && error.message.includes("doesn't exist")) {
      return NextResponse.json({
        logs: [],
        total: 0,
        limit: 100,
        offset: 0,
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch booking delete logs", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

