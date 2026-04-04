import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

// Get recipients of a broadcast
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const broadcastId = parseInt(id);
    
    if (isNaN(broadcastId)) {
      return NextResponse.json(
        { error: "Invalid broadcast ID" },
        { status: 400 }
      );
    }

    // Get broadcast details
    const broadcast = await prisma.$queryRaw<Array<{
      id: number;
      message: string;
      sent_at: Date | null;
    }>>`
      SELECT id, message, sent_at
      FROM broadcast_settings
      WHERE id = ${broadcastId}
      LIMIT 1
    `;

    if (broadcast.length === 0) {
      return NextResponse.json(
        { error: "Broadcast not found" },
        { status: 404 }
      );
    }

    const broadcastData = broadcast[0];

    // If not sent yet, return empty list
    if (!broadcastData.sent_at) {
      return NextResponse.json({
        recipients: [],
        total: 0,
      });
    }

    // Get recipients from lineLog
    // Search for logs with [Broadcast] prefix and matching message
    // Use sent_at time range (within 5 minutes) to find matching logs
    const sentAtStart = new Date(broadcastData.sent_at);
    sentAtStart.setMinutes(sentAtStart.getMinutes() - 5);
    const sentAtEnd = new Date(broadcastData.sent_at);
    sentAtEnd.setMinutes(sentAtEnd.getMinutes() + 5);

    const recipients = await prisma.$queryRaw<Array<{
      line_id: string | null;
      created_at: Date | null;
    }>>`
      SELECT DISTINCT line_id, created_at
      FROM line_log
      WHERE message LIKE ${`[Broadcast]%`}
        AND message LIKE ${`%${broadcastData.message.substring(0, 50)}%`}
        AND created_at >= ${sentAtStart}
        AND created_at <= ${sentAtEnd}
      ORDER BY created_at DESC
    `;

    // Get user details for each recipient
    const recipientDetails = await Promise.all(
      recipients.map(async (recipient) => {
        if (!recipient.line_id) return null;

        // Try to find user from booking table
        const user = await prisma.$queryRaw<Array<{
          booker_name: string;
          booker_tel: string;
        }>>`
          SELECT DISTINCT booker_name, booker_tel
          FROM booking
          WHERE line_id = ${recipient.line_id}
          ORDER BY id DESC
          LIMIT 1
        `;

        return {
          lineId: recipient.line_id,
          name: user.length > 0 ? user[0].booker_name : 'ไม่ระบุชื่อ',
          phone: user.length > 0 ? user[0].booker_tel : 'ไม่ระบุเบอร์',
          sentAt: recipient.created_at ? (recipient.created_at instanceof Date ? recipient.created_at.toISOString() : new Date(recipient.created_at).toISOString()) : null,
        };
      })
    );

    // Filter out null values
    const validRecipients = recipientDetails.filter((r): r is NonNullable<typeof r> => r !== null);

    return NextResponse.json({
      recipients: validRecipients,
      total: validRecipients.length,
    });
  } catch (error) {
    console.error("Get broadcast recipients error", error);
    return NextResponse.json(
      {
        error: "Failed to get recipients",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}


