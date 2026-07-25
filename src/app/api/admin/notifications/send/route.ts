import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  fetchNotifiableBookings,
  formatBookingDate,
  formatBookingTime,
} from "@/lib/notification-targets";

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const BOOKING_BASE_URL = process.env.NEXT_PUBLIC_BOOKING_URL || "https://bee04d1d0eb3.ngrok-free.app";

// Create Flex Message for booking notification
function createNotificationFlexMessage(booking: {
  id: number;
  booking_id?: string | null;
  booker_name: string;
  book_date: Date;
  book_time: string | null;
  branch_name: string | null;
  service_name?: string | null;
  employee_name?: string | null;
  status: string | null;
  dateStr: string;
  timeStr: string;
}) {
  // Format date for display (Buddhist era)
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleDateString("th-TH", { month: "long" });
    const year = d.getFullYear() + 543; // Convert to Buddhist era
    return `${day} ${month} ${year}`;
  };

  // Get status text and color
  const getStatusInfo = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return { text: "ยืนยันแล้ว", color: "#1DB446" };
      case "completed":
        return { text: "เสร็จสิ้น", color: "#0066CC" };
      case "cancelled":
        return { text: "ยกเลิก", color: "#CC0000" };
      default:
        return { text: "รอยืนยัน", color: "#FF9900" };
    }
  };

  const statusInfo = getStatusInfo(booking.status);

  return {
    type: "flex",
    altText: `แจ้งเตือนการนัดหมาย - ${booking.booker_name}`,
    contents: {
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "lg",
        contents: [
          {
            type: "text",
            text: "แจ้งเตือนการนัดหมาย",
            weight: "bold",
            size: "sm",
            color: "#1DB446",
          },
          {
            type: "separator",
            margin: "md",
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            margin: "md",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "•",
                    size: "sm",
                    flex: 0,
                    color: "#1DB446",
                  },
                  {
                    type: "text",
                    text: `เลขที่จอง: ${booking.booking_id || `BK-${String(booking.id).padStart(6, '0')}`}`,
                    size: "sm",
                    color: "#333333",
                    flex: 1,
                    wrap: true,
                  },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "•",
                    size: "sm",
                    flex: 0,
                    color: "#1DB446",
                  },
                  {
                    type: "text",
                    text: `ชื่อ: ${booking.booker_name}`,
                    size: "sm",
                    color: "#333333",
                    flex: 1,
                    wrap: true,
                  },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "•",
                    size: "sm",
                    flex: 0,
                    color: "#1DB446",
                  },
                  {
                    type: "text",
                    text: `วันที่: ${formatDate(booking.book_date)}`,
                    size: "sm",
                    color: "#333333",
                    flex: 1,
                    wrap: true,
                  },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "•",
                    size: "sm",
                    flex: 0,
                    color: "#1DB446",
                  },
                  {
                    type: "text",
                    text: `เวลา: ${booking.timeStr}`,
                    size: "sm",
                    color: "#333333",
                    flex: 1,
                    wrap: true,
                  },
                ],
              },
              ...(booking.branch_name ? [{
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "•",
                    size: "sm",
                    flex: 0,
                    color: "#1DB446",
                  },
                  {
                    type: "text",
                    text: `สาขา: ${booking.branch_name}`,
                    size: "sm",
                    color: "#333333",
                    flex: 1,
                    wrap: true,
                  },
                ],
              }] : []),
              ...(booking.service_name ? [{
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "•",
                    size: "sm",
                    flex: 0,
                    color: "#1DB446",
                  },
                  {
                    type: "text",
                    text: `บริการ: ${booking.service_name}`,
                    size: "sm",
                    color: "#333333",
                    flex: 1,
                    wrap: true,
                  },
                ],
              }] : []),
              ...(booking.employee_name ? [{
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "•",
                    size: "sm",
                    flex: 0,
                    color: "#1DB446",
                  },
                  {
                    type: "text",
                    text: `พนักงาน: ${booking.employee_name.trim()}`,
                    size: "sm",
                    color: "#333333",
                    flex: 1,
                    wrap: true,
                  },
                ],
              }] : []),
            ],
          },
          {
            type: "separator",
            margin: "md",
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "สถานะ:",
                size: "sm",
                color: "#666666",
                flex: 0,
              },
              {
                type: "text",
                text: statusInfo.text,
                size: "sm",
                color: statusInfo.color,
                weight: "bold",
                flex: 1,
              },
            ],
          },
          {
            type: "text",
            text: "กรุณามาถึงก่อนเวลา 15 นาที",
            size: "xs",
            color: "#FF9900",
            weight: "bold",
            align: "center",
            margin: "md",
            wrap: true,
          },
        ],
      },
    },
  };
}

// Send notification to LINE user
async function sendLineMessage(userId: string, flexMessage: any) {
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
        messages: [flexMessage],
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

// Replace template variables
function replaceTemplate(template: string, data: {
  name?: string;
  date?: string;
  time?: string;
  branch?: string;
}): string {
  let message = template;
  if (data.name) message = message.replace(/{name}/g, data.name);
  if (data.date) message = message.replace(/{date}/g, data.date);
  if (data.time) message = message.replace(/{time}/g, data.time);
  if (data.branch) message = message.replace(/{branch}/g, data.branch);
  return message;
}

// Send notifications for upcoming bookings
export async function POST(request: NextRequest) {
  try {
    // Public endpoint: no authentication required

    // Optional single-recipient mode (used by the admin test send).
    // Without a bookingId this is the scheduled run: everyone on the target date.
    let bookingId: number | undefined;
    try {
      const body = await request.json();
      const rawId = body?.bookingId;
      const parsed = typeof rawId === "number" ? rawId : parseInt(rawId, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        bookingId = parsed;
      }
    } catch {
      // No body (cron trigger) - fall through to the full run
    }

    // Get notification settings
    const settings = await prisma.$queryRaw<Array<{
      enabled: string;
      notification_time: string;
      message_template: string | null;
      days_before: number;
    }>>`
      SELECT * FROM notification_settings
      ORDER BY id DESC
      LIMIT 1
    `;

    // The enabled switch guards the scheduled run only - an explicit test send
    // to one chosen person stays available while notifications are off
    if (!bookingId && (settings.length === 0 || settings[0].enabled !== "yes")) {
      return NextResponse.json({
        success: true,
        message: "Notifications are disabled",
        sent: 0,
      });
    }

    const setting = settings[0];
    const daysBefore = setting?.days_before || 1;

    const bookings = await fetchNotifiableBookings({ daysBefore, bookingId });

    if (bookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: bookingId
          ? "ไม่พบรายการจองที่เลือก หรือรายการนี้ไม่เข้าเงื่อนไขการแจ้งเตือนแล้ว"
          : "No bookings to notify",
        sent: 0,
      });
    }

    // Send notifications
    let sentCount = 0;
    let failedCount = 0;

    for (const booking of bookings) {
      if (!booking.line_id) continue;

      const bookDate = booking.book_date instanceof Date
        ? booking.book_date
        : new Date(booking.book_date);
      const dateStr = formatBookingDate(bookDate);
      const timeStr = formatBookingTime(booking.book_time);

      // Create Flex Message
      const flexMessage = createNotificationFlexMessage({
        id: booking.id,
        booking_id: booking.booking_id,
        booker_name: booking.booker_name,
        book_date: bookDate,
        book_time: booking.book_time,
        branch_name: booking.branch_name,
        service_name: booking.service_name,
        employee_name: booking.employee_name,
        status: booking.status,
        dateStr: dateStr,
        timeStr: timeStr,
      });

      // Send LINE message
      const success = await sendLineMessage(booking.line_id, flexMessage);

      if (success) {
        sentCount++;
      } else {
        failedCount++;
        console.error(`❌ Failed to send notification to ${booking.booker_name} (${booking.line_id})`);
      }

      // Log notification
      try {
        await prisma.lineLog.create({
          data: {
            lineId: booking.line_id,
            message: `[Notification] แจ้งเตือนการนัดหมาย - ${booking.booker_name} วันที่ ${dateStr} เวลา ${timeStr}`,
            createdAt: new Date(),
          },
        });
      } catch (logError) {
        console.error("Error logging notification:", logError);
      }
    }

    return NextResponse.json({
      success: true,
      message: bookingId
        ? sentCount > 0
          ? `ส่งการแจ้งเตือนถึง ${bookings[0].booker_name} เรียบร้อย`
          : `ส่งการแจ้งเตือนถึง ${bookings[0].booker_name} ไม่สำเร็จ`
        : `Notifications sent: ${sentCount}, Failed: ${failedCount}`,
      sent: sentCount,
      failed: failedCount,
      total: bookings.length,
    });
  } catch (error) {
    console.error("Send notifications error", error);
    return NextResponse.json(
      {
        error: "Failed to send notifications",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// GET endpoint for manual trigger (for testing)
export async function GET(request: NextRequest) {
  // Public info endpoint
  return NextResponse.json({
    message: "Use POST method to send notifications",
  });
}

