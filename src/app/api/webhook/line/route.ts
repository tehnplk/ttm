import { NextRequest, NextResponse } from "next/server";
import { messagingApi, WebhookEvent, validateSignature } from "@line/bot-sdk";
import prisma from "@/lib/prisma";


/* เพิ่มที่ .env */
/*
# จองคิว
URL_BOOKING=http://localhost:3000/booking

# ประวัติการจอง
URL_HISTORY=http://localhost:3000/history

# คำถามพบบ่อย
URL_FAQ=http://localhost:3000/faq

#ถ้า production ให้เปลี่ยน url เป็น https://ttm.plkhealth.go.th/xxx

*/



// บังคับใช้ Node.js Runtime เพื่อรองรับ Prisma และ LINE SDK เต็มรูปแบบ
export const runtime = "nodejs";

// ตั้งค่า LINE SDK จาก environment variables
const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

// สร้าง LINE Messaging API client
const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
});


// URLs สำหรับลิงค์ต่างๆ
const BOOKING_URL = process.env.URL_BOOKING || "";
const HISTORY_URL = process.env.URL_HISTORY || "";
const FAQ_URL = process.env.URL_FAQ || "";

// Helper function สำหรับส่งข้อความ (ใช้ Reply Message เท่านั้น - ไม่เสียเงิน)
async function sendMessage(
  event: WebhookEvent,
  messages: messagingApi.Message[]
): Promise<messagingApi.ReplyMessageResponse | null> {
  // ถ้าเป็น standby mode ไม่ตอบกลับ (ไม่มี replyToken)
  if ('mode' in event && event.mode === 'standby') {
    console.log('Bot is in standby mode, skipping reply (use Reply Message only to save cost)');
    return null;
  }
  
  // ใช้ replyMessage เท่านั้น (ฟรี)
  const replyToken = 'replyToken' in event ? event.replyToken : null;
  if (!replyToken || replyToken.trim() === '') {
    console.warn('No replyToken available, skipping reply');
    return null;
  }
  
  return client.replyMessage({
    replyToken: replyToken,
    messages: messages,
  });
}

// จัดการ webhook events
async function handleEvent(
  event: WebhookEvent
): Promise<messagingApi.ReplyMessageResponse | null> {
  console.log("handleEvent", event);
  
  // Handle follow (เพิ่มเพื่อน)
  if (event.type === "follow") {
    try {
      const userId = event.source.userId || "";
      await prisma.lineLog.create({
        data: {
          lineId: userId,
          message: "ติดตาม (Add Friend)",
          createdAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error saving follow log:", error);
    }
    return null;
  }

  // Handle unfollow (เลิกติดตาม/บล็อก)
  if (event.type === "unfollow") {
    try {
      const userId = event.source.userId || "";
      await prisma.lineLog.create({
        data: {
          lineId: userId,
          message: "เลิกติดตาม (Block/Unfriend)",
          createdAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error saving unfollow log:", error);
    }
    return null;
  }

  // รับเฉพาะ message event ที่เป็น text เท่านั้น
  if (event.type !== "message" || event.message.type !== "text") {
    return null;
  }

  const userMessage = event.message.text;

  // user ถาม จองคิว
  if (userMessage.includes("จองคิว")) { 
    // ดึง LINE user ID จาก event source
    const userId = event.source.userId || "";
    // สร้าง URL พร้อมแนบ LINE ID
    const bookingUrlWithLineId = `${BOOKING_URL}?userid=${userId}`;

    // ตอบกลับด้วย Flex Message พร้อมปุ่มสีเขียว
    const bookingFlex: messagingApi.FlexMessage = {
      type: "flex",
      altText: "จองคิว - กดปุ่มด้านล่างเพื่อจองคิว",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "🗓️ จองคิว",
              weight: "bold",
              size: "xl",
              align: "center",
            },
            {
              type: "text",
              text: "กรุณากดปุ่มด้านล่างเพื่อจองคิวของคุณ",
              size: "sm",
              color: "#666666",
              align: "center",
              margin: "md",
            },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              action: {
                type: "uri",
                label: "📅 จองคิวเลย",
                uri: bookingUrlWithLineId,
              },
              style: "primary",
              color: "#22C55E", // สีเขียว
            },
          ],
        },
      },
    };

    return sendMessage(event, [bookingFlex]);
  }

  // user ถาม ประวัติการจอง
  if (userMessage.includes("ประวัติการจอง")) {
    // ดึง LINE user ID จาก event source
    const userId = event.source.userId || "";
    // สร้าง URL พร้อมแนบ LINE ID
    const historyUrlWithLineId = `${HISTORY_URL}?userid=${userId}`;

    // ตอบกลับด้วย Flex Message พร้อมปุ่มสีส้ม
    const historyFlex: messagingApi.FlexMessage = {
      type: "flex",
      altText: "ประวัติการจอง - กดปุ่มด้านล่างเพื่อดูประวัติ",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "📋 ประวัติการจอง",
              weight: "bold",
              size: "xl",
              align: "center",
            },
            {
              type: "text",
              text: "กรุณากดปุ่มด้านล่างเพื่อดูประวัติการจองของคุณ",
              size: "sm",
              color: "#666666",
              align: "center",
              margin: "md",
            },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              action: {
                type: "uri",
                label: "📜 ดูประวัติการจอง",
                uri: historyUrlWithLineId,
              },
              style: "primary",
              color: "#F97316", // สีส้ม
            },
            {
              type: "button",
              action: {
                type: "uri",
                label: "📱 ดูประวัติจากเบอร์โทร",
                uri: "https://ttm.plkhealth.go.th/patient-bookings",
              },
              style: "secondary",
              margin: "md",
            },
          ],
        },
      },
    };

    return sendMessage(event, [historyFlex]);
  }

  // user ถาม คำถามพบบ่อย
  if (userMessage.includes("คำถามพบบ่อย")) {
    // ดึง LINE user ID จาก event source
    const userId = event.source.userId || "";
    // สร้าง URL พร้อมแนบ LINE ID
    const faqUrlWithLineId = `${FAQ_URL}?userid=${userId}`;

    // ตอบกลับด้วย Buttons Template พร้อมปุ่มลิงค์ FAQ
    const satisfactionSurveyUrl =
      "https://docs.google.com/forms/d/e/1FAIpQLSerKi3gib0wYazRCrLS53PC_o-kGYwIWSBbV8LHEdhBgwDIeA/viewform";

    const faqTemplate: messagingApi.TemplateMessage = {
      type: "template",
      altText: "คำถามพบบ่อย - กดปุ่มด้านล่างเพื่อดูคำถามที่พบบ่อย",
      template: {
        type: "buttons",
        title: "❓ คำถามพบบ่อย/ความพึงพอใจ",
        text: "กรุณากดปุ่มด้านล่างเพื่อดูคำตอบที่พบบ่อย หรือแบบสอบถามความพึงพอใจ",
        actions: [
          {
            type: "uri",
            label: "📖 ดูคำถามพบบ่อย",
            uri: faqUrlWithLineId,
          },
          {
            type: "uri",
            label: "📋 แบบสอบถาม",
            uri: satisfactionSurveyUrl,
          },
        ],
      },
    };

    return sendMessage(event, [faqTemplate]);
  }

  // ตอบกลับข้อความอื่นๆ
  // บันทึก log ลงฐานข้อมูล
  try {
    const userId = event.source.userId || "";
    await prisma.lineLog.create({
      data: {
        lineId: userId,
        message: userMessage,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error saving line log:", error);
  }

  return sendMessage(event, [
    {
      type: "text",
      text: "🌈✨ สวัสดีค่ะ! 😊🌸",
    },
  ]);
}

// POST handler สำหรับ LINE webhook
export async function POST(request: NextRequest) {
  try {
    // อ่าน raw body สำหรับการตรวจสอบ signature
    const body = await request.text();
    const signature = request.headers.get("x-line-signature") || "";

    // ตรวจสอบ signature
    if (!validateSignature(body, config.channelSecret, signature)) {
      console.error("Signature ไม่ถูกต้อง");
      return NextResponse.json({ error: "Signature ไม่ถูกต้อง" }, { status: 401 });
    }

    // แปลง body เป็น JSON
    const webhookBody = JSON.parse(body) as { events: WebhookEvent[] };

    const events = webhookBody.events;

    // ประมวลผล events ทั้งหมด
    const results = await Promise.all(events.map(handleEvent));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดใน Webhook:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}

// GET handler สำหรับตรวจสอบสถานะ webhook
export async function GET() {
  return NextResponse.json({ status: "LINE Webhook กำลังทำงาน" });
}
