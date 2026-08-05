import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

// Get the recipients recorded for a broadcast
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const { id } = await params;
    const logId = parseInt(id);
    if (isNaN(logId)) {
      return NextResponse.json(
        { error: "Invalid log ID" },
        { status: 400 },
      );
    }

    const recipients = await prisma.$queryRaw<Array<{
      lineId: string;
      name: string | null;
      phone: string | null;
      success: string;
      sentAt: Date | null;
    }>>`
      SELECT
        line_id as lineId,
        name,
        phone,
        success,
        sent_at as sentAt
      FROM broadcast_send_recipient
      WHERE log_id = ${logId}
      ORDER BY id ASC
    `;

    return NextResponse.json({
      recipients: recipients.map((recipient) => ({
        lineId: recipient.lineId,
        name: recipient.name || "ไม่ระบุชื่อ",
        phone: recipient.phone || "ไม่ระบุเบอร์",
        success: recipient.success === "yes",
        sentAt: recipient.sentAt
          ? (recipient.sentAt instanceof Date ? recipient.sentAt.toISOString() : new Date(recipient.sentAt).toISOString())
          : null,
      })),
      total: recipients.length,
    });
  } catch (error) {
    console.error("Get broadcast recipients error", error);
    return NextResponse.json(
      {
        error: "Failed to get recipients",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
