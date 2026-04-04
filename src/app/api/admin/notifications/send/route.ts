import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

    if (settings.length === 0 || settings[0].enabled !== "yes") {
      return NextResponse.json({
        success: true,
        message: "Notifications are disabled",
        sent: 0,
      });
    }

    const setting = settings[0];
    const daysBefore = setting.days_before || 1;
    const messageTemplate = setting.message_template || 
      "สวัสดีครับ คุณ{name} มีนัดในวันพรุ่งนี้ (วันที่ {date}) เวลา {time} ที่ {branch} กรุณามาตามเวลานัดหมาย";

    // Calculate target date (today + daysBefore)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBefore);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get bookings for target date with related data
    const bookings = await prisma.$queryRaw<Array<{
      id: number;
      booker_name: string;
      booker_tel: string;
      book_date: Date;
      book_time: string | null;
      line_id: string | null;
      branch_name: string | null;
      service_name: string | null;
      employee_name: string | null;
      booking_id: string | null;
      status: string | null;
    }>>`
      SELECT 
        b.id,
        b.booker_name,
        b.booker_tel,
        b.book_date,
        b.book_time,
        b.line_id,
        br.name as branch_name,
        s.name as service_name,
        CONCAT(COALESCE(e.prename, ''), COALESCE(e.fname, ''), ' ', COALESCE(e.lname, '')) as employee_name,
        COALESCE(b.booking_id, CONCAT('BK-', LPAD(b.id, 6, '0'))) as booking_id,
        b.status
      FROM booking b
      LEFT JOIN Branch br ON b.branch_id = br.id
      LEFT JOIN Service s ON b.service_id = s.id
      LEFT JOIN employee e ON b.emp_id = e.id
      WHERE DATE(b.book_date) = DATE(${nextDay})
        AND b.line_id IS NOT NULL
        AND b.line_id != ''
        AND (b.status IS NULL OR b.status = 'pending' OR b.status = 'confirmed')
      ORDER BY b.book_time ASC
    `;

    if (bookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No bookings to notify",
        sent: 0,
      });
    }

    // Send notifications
    let sentCount = 0;
    let failedCount = 0;

    for (const booking of bookings) {
      if (!booking.line_id) continue;

      // Format date
      const bookDate = booking.book_date instanceof Date 
        ? booking.book_date 
        : new Date(booking.book_date);
      const dateStr = bookDate.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Format time - extract from time slot ID or use as is
      let timeStr = booking.book_time || "ไม่ระบุ";
      if (timeStr.startsWith("t-")) {
        // Extract time from time slot ID: "t-1-10:30-12:30" -> "10:30 - 12:30"
        const parts = timeStr.split("-");
        if (parts.length >= 4) {
          timeStr = `${parts[2]} - ${parts[3]}`;
        }
      } else if (timeStr.includes(" - ")) {
        // Already in correct format
        timeStr = timeStr;
      }

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
      message: `Notifications sent: ${sentCount}, Failed: ${failedCount}`,
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

