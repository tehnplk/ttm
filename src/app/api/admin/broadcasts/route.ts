import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

// Get all broadcast settings
export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // Optional: filter by date (YYYY-MM-DD)

    const where: any = {};
    if (date) {
      const dateObj = new Date(date);
      const nextDay = new Date(dateObj);
      nextDay.setDate(nextDay.getDate() + 1);
      where.broadcastDate = {
        gte: dateObj,
        lt: nextDay,
      };
    }

    // Use raw query to get branchIds field that may not be in Prisma model
    let broadcasts;
    if (date) {
      const dateObj = new Date(date);
      broadcasts = await prisma.$queryRaw<Array<{
        id: number;
        broadcastDate: Date;
        broadcastTime: string;
        message: string;
        branchIds: string;
        enabled: string;
        sent: string;
        sentAt: Date | null;
        createdAt: Date | null;
        updatedAt: Date | null;
      }>>`
        SELECT 
          id,
          broadcast_date as broadcastDate,
          broadcast_time as broadcastTime,
          message,
          COALESCE(branch_ids, '[]') as branchIds,
          enabled,
          sent,
          sent_at as sentAt,
          created_at as createdAt,
          updated_at as updatedAt
        FROM broadcast_settings
        WHERE DATE(broadcast_date) = DATE(${dateObj})
        ORDER BY broadcast_date ASC, broadcast_time ASC
      `;
    } else {
      broadcasts = await prisma.$queryRaw<Array<{
        id: number;
        broadcastDate: Date;
        broadcastTime: string;
        message: string;
        branchIds: string;
        enabled: string;
        sent: string;
        sentAt: Date | null;
        createdAt: Date | null;
        updatedAt: Date | null;
      }>>`
        SELECT 
          id,
          broadcast_date as broadcastDate,
          broadcast_time as broadcastTime,
          message,
          COALESCE(branch_ids, '[]') as branchIds,
          enabled,
          sent,
          sent_at as sentAt,
          created_at as createdAt,
          updated_at as updatedAt
        FROM broadcast_settings
        ORDER BY broadcast_date ASC, broadcast_time ASC
      `;
    }

    return NextResponse.json({
      broadcasts: broadcasts.map((b) => {
        // Parse branchIds from JSON string to array
        let branchIds: string[] = [];
        try {
          const branchIdsStr = b.branchIds || "[]";
          const parsed = JSON.parse(branchIdsStr);
          // Ensure all IDs are strings
          branchIds = Array.isArray(parsed) ? parsed.map(id => String(id)) : [];
        } catch (err) {
          console.error('Error parsing branchIds:', err, 'Raw value:', b.branchIds);
          branchIds = [];
        }
        return {
          id: b.id,
          broadcastDate: b.broadcastDate instanceof Date
            ? b.broadcastDate.toISOString().split('T')[0]
            : new Date(b.broadcastDate).toISOString().split('T')[0],
          broadcastTime: b.broadcastTime,
          message: b.message,
          branchIds,
          enabled: b.enabled,
          sent: b.sent,
          sentAt: b.sentAt ? (b.sentAt instanceof Date ? b.sentAt.toISOString() : new Date(b.sentAt).toISOString()) : null,
          createdAt: b.createdAt ? (b.createdAt instanceof Date ? b.createdAt.toISOString() : new Date(b.createdAt).toISOString()) : "",
          updatedAt: b.updatedAt ? (b.updatedAt instanceof Date ? b.updatedAt.toISOString() : new Date(b.updatedAt).toISOString()) : "",
        };
      }),
    });
  } catch (error) {
    console.error("Get broadcast settings error", error);
    return NextResponse.json(
      {
        error: "Failed to load broadcast settings",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// Create broadcast setting
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const broadcastDate = typeof body.broadcastDate === "string" ? body.broadcastDate.trim() : "";
    const broadcastTime = typeof body.broadcastTime === "string" ? body.broadcastTime.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const branchIds = Array.isArray(body.branchIds) ? body.branchIds : [];
    const enabled = typeof body.enabled === "string" ? body.enabled : "yes";

    // Validate
    if (!broadcastDate || !broadcastTime || !message) {
      return NextResponse.json(
        { error: "กรุณากรอกวันที่ เวลา และข้อความให้ครบถ้วน" },
        { status: 400 },
      );
    }

    if (!branchIds || branchIds.length === 0) {
      return NextResponse.json(
        { error: "กรุณาเลือกสาขาอย่างน้อย 1 สาขา" },
        { status: 400 },
      );
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(broadcastTime)) {
      return NextResponse.json(
        { error: "รูปแบบเวลาไม่ถูกต้อง ต้องเป็น HH:mm (เช่น 09:00)" },
        { status: 400 },
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(broadcastDate)) {
      return NextResponse.json(
        { error: "รูปแบบวันที่ไม่ถูกต้อง ต้องเป็น YYYY-MM-DD (เช่น 2024-01-15)" },
        { status: 400 },
      );
    }

    // Check if duplicate (same date and time)
    const dateObj = new Date(broadcastDate);
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    const existing = await prisma.broadcastSettings.findFirst({
      where: {
        broadcastDate: {
          gte: dateObj,
          lt: nextDay,
        },
        broadcastTime,
        enabled: 'yes',
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "มีการตั้งค่าส่ง broadcast ในวันที่และเวลานี้แล้ว" },
        { status: 400 },
      );
    }

    // Create new broadcast setting
    // Use raw query to handle branchIds field that may not exist yet
    let createdId: number;
    try {
      // Try with branchIds first
      const result = await prisma.$executeRaw`
        INSERT INTO broadcast_settings (broadcast_date, broadcast_time, message, branch_ids, enabled, sent, created_at, updated_at)
        VALUES (${dateObj}, ${broadcastTime}, ${message}, ${JSON.stringify(branchIds)}, ${enabled}, 'no', NOW(), NOW())
      `;
      // Get the created ID
      const created = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM broadcast_settings
        WHERE broadcast_date = ${dateObj}
          AND broadcast_time = ${broadcastTime}
          AND message = ${message}
        ORDER BY id DESC
        LIMIT 1
      `;
      createdId = created[0]?.id || 0;
    } catch (createError: any) {
      // If branchIds column doesn't exist, create without it
      if (createError.message?.includes('branch_ids') || createError.message?.includes('Unknown column')) {
        await prisma.$executeRaw`
          INSERT INTO broadcast_settings (broadcast_date, broadcast_time, message, enabled, sent, created_at, updated_at)
          VALUES (${dateObj}, ${broadcastTime}, ${message}, ${enabled}, 'no', NOW(), NOW())
        `;
        const created = await prisma.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM broadcast_settings
          WHERE broadcast_date = ${dateObj}
            AND broadcast_time = ${broadcastTime}
            AND message = ${message}
          ORDER BY id DESC
          LIMIT 1
        `;
        createdId = created[0]?.id || 0;
      } else {
        throw createError;
      }
    }

    return NextResponse.json({
      success: true,
      id: createdId,
      broadcastDate,
      broadcastTime,
      message,
      branchIds,
      enabled,
    }, { status: 201 });
  } catch (error) {
    console.error("Create broadcast setting error", error);
    return NextResponse.json(
      {
        error: "Failed to create broadcast setting",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

