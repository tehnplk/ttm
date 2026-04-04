import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

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

// Send notification for a specific booking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const bookingId = parseInt(id);
    
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { error: "Invalid booking ID" },
        { status: 400 },
      );
    }

    // Get booking with related data
    const booking = await prisma.$queryRaw<Array<{
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
      WHERE b.id = ${bookingId}
      LIMIT 1
    `;

    if (booking.length === 0) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 },
      );
    }

    const bookingData = booking[0];

    if (!bookingData.line_id) {
      return NextResponse.json(
        { error: "ลูกค้าไม่มี LINE ID ในระบบ" },
        { status: 400 },
      );
    }

    // Format date
    const bookDate = bookingData.book_date instanceof Date 
      ? bookingData.book_date 
      : new Date(bookingData.book_date);
    const dateStr = bookDate.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Format time - extract from time slot ID or use as is
    let timeStr = bookingData.book_time || "ไม่ระบุ";
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
      id: bookingData.id,
      booking_id: bookingData.booking_id,
      booker_name: bookingData.booker_name,
      book_date: bookDate,
      book_time: bookingData.book_time,
      branch_name: bookingData.branch_name,
      service_name: bookingData.service_name,
      employee_name: bookingData.employee_name,
      status: bookingData.status,
      dateStr: dateStr,
      timeStr: timeStr,
    });

    // Send LINE message
    const success = await sendLineMessage(bookingData.line_id, flexMessage);

    if (!success) {
      return NextResponse.json(
        { error: "ไม่สามารถส่งการแจ้งเตือนผ่าน LINE ได้" },
        { status: 500 },
      );
    }

    // Log notification
    try {
      await prisma.lineLog.create({
        data: {
          lineId: bookingData.line_id,
          message: `[Manual Notification] แจ้งเตือนการนัดหมาย - ${bookingData.booker_name} วันที่ ${dateStr} เวลา ${timeStr}`,
          createdAt: new Date(),
        },
      });
    } catch (logError) {
      console.error("Error logging notification:", logError);
    }

    return NextResponse.json({
      success: true,
      message: `ส่งการแจ้งเตือนไปยัง ${bookingData.booker_name} เรียบร้อย`,
    });
  } catch (error) {
    console.error("Send notification error", error);
    return NextResponse.json(
      {
        error: "Failed to send notification",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

