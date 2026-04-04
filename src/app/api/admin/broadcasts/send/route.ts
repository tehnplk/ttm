import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// Send broadcast message to LINE user
async function sendLineMessage(userId: string, message: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error("❌ LINE_CHANNEL_ACCESS_TOKEN is not set");
    return false;
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: "text",
            text: message,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ LINE API error:", response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Error sending LINE message:", error);
    return false;
  }
}

// Send broadcasts for current time
export async function POST(request: NextRequest) {
  try {
    // Verify API key (optional, for security)
    const apiKey = request.headers.get("x-api-key");
    const expectedApiKey = process.env.CRON_API_KEY || "your-secret-api-key";

    if (apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Get broadcasts that should be sent now
    const broadcasts = await prisma.$queryRaw<Array<{
      id: number;
      broadcast_date: Date;
      broadcast_time: string;
      message: string;
    }>>`
      SELECT 
        id,
        broadcast_date,
        broadcast_time,
        message
      FROM broadcast_settings
      WHERE DATE(broadcast_date) = DATE(${today})
        AND broadcast_time = ${currentTime}
        AND enabled = 'yes'
        AND sent = 'no'
    `;

    if (broadcasts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No broadcasts to send at this time",
        sent: 0,
      });
    }

    // Get all LINE users (from bookings with line_id)
    const lineUsers = await prisma.$queryRaw<Array<{
      line_id: string;
    }>>`
      SELECT DISTINCT line_id
      FROM booking
      WHERE line_id IS NOT NULL
        AND line_id != ''
    `;

    if (lineUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No LINE users found",
        sent: 0,
      });
    }

    let totalSent = 0;
    let totalFailed = 0;

    // Send each broadcast to all users
    for (const broadcast of broadcasts) {
      let broadcastSent = 0;
      let broadcastFailed = 0;

      for (const user of lineUsers) {
        if (!user.line_id) continue;

        const success = await sendLineMessage(user.line_id, broadcast.message);

        if (success) {
          broadcastSent++;
          totalSent++;
        } else {
          broadcastFailed++;
          totalFailed++;
        }

        // Log message
        try {
          await prisma.lineLog.create({
            data: {
              lineId: user.line_id,
              message: `[Broadcast] ${broadcast.message}`,
              createdAt: new Date(),
            },
          });
        } catch (logError) {
          console.error("Error logging broadcast:", logError);
        }
      }

      // Mark broadcast as sent
      await prisma.$executeRaw`
        UPDATE broadcast_settings
        SET sent = 'yes',
            sent_at = NOW(),
            updated_at = NOW()
        WHERE id = ${broadcast.id}
      `;

    }

    return NextResponse.json({
      success: true,
      message: `Broadcasts sent: ${totalSent}, Failed: ${totalFailed}`,
      sent: totalSent,
      failed: totalFailed,
      broadcastsProcessed: broadcasts.length,
    });
  } catch (error) {
    console.error("Send broadcasts error", error);
    return NextResponse.json(
      {
        error: "Failed to send broadcasts",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// GET endpoint for manual trigger (for testing)
export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  return NextResponse.json({
    message: "Use POST method to send broadcasts",
    note: "This endpoint requires x-api-key header for security",
  });
}

