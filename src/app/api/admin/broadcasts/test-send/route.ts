import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";
import {
  BroadcastTarget,
  resolveBroadcastMessage,
  runBroadcast,
} from "@/lib/line-broadcast";

// Send a broadcast (image, text or YouTube link) to a single LINE user, for testing
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const lineId = typeof body.lineId === "string" ? body.lineId.trim() : "";

    if (!lineId) {
      return NextResponse.json(
        { error: "กรุณาเลือกผู้รับ 1 คน" },
        { status: 400 },
      );
    }

    const { message, error: messageError } = resolveBroadcastMessage(body);
    if (messageError || !message) {
      return NextResponse.json({ error: messageError }, { status: 400 });
    }

    // Only allow LINE IDs that actually exist in our bookings
    const targets = await prisma.$queryRaw<BroadcastTarget[]>`
      SELECT b.line_id, b.booker_name AS name, b.booker_tel AS phone
      FROM booking b
      WHERE b.line_id = ${lineId}
      ORDER BY b.id DESC
      LIMIT 1
    `;

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบผู้รับรายนี้ในระบบ" },
        { status: 400 },
      );
    }

    const result = await runBroadcast({
      message,
      branchIds: [],
      targets,
      isTest: true,
    });

    return NextResponse.json({
      success: true,
      id: result.logId,
      total: result.total,
      sent: result.sent,
      failed: result.failed,
      name: targets[0].name,
    });
  } catch (error) {
    console.error("Test send broadcast error", error);
    return NextResponse.json(
      {
        error: "Failed to send test broadcast",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
