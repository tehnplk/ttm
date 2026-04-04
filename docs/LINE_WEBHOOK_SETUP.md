# LINE Webhook Setup Guide

## ไฟล์ที่สร้าง
- `src/app/api/webhook/line/route.ts` - LINE Webhook API endpoint

## ขั้นตอนติดตั้ง & การใช้งาน (ไล่ flow)
1) ตั้งค่า Environment (.env)
   ```env
   LINE_CHANNEL_SECRET=your_channel_secret_here
   LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
   NEXT_PUBLIC_BOOKING_URL=https://your-domain.com   # หรือ ngrok URL
   ```
2) ตั้งค่า Webhook ใน LINE Developers
   - ไปที่ Messaging API → Webhook URL → `https://your-domain.com/api/webhook/line`
   - Dev ใช้ ngrok: `https://<ngrok>.ngrok.io/api/webhook/line`
   - กด Verify และเปิด Use webhook
3) ทดสอบรับ event (local)
   ```bash
   curl -X POST http://localhost:3000/api/webhook/line \
     -H "Content-Type: application/json" \
     -H "x-line-signature: your_signature" \
     -d '{"events":[{"type":"message","replyToken":"test","source":{"type":"user","userId":"Utest"},"timestamp":123,"message":{"type":"text","id":"1","text":"จองคิว"}}]}'
   ```
4) ใช้งานจริง
   - ผู้ใช้ส่งข้อความ → LINE ยิง webhook → ระบบตอบกลับ (reply ถ้ามี replyToken, push หากไม่มี)
   - คำสั่งหลัก: “จองคิว”, “ประวัติการจอง”, “คำถามพบบ่อย”

## Features

### 1. Signature Verification
- ตรวจสอบ signature จาก LINE เพื่อความปลอดภัย
- ใช้ HMAC-SHA256 algorithm

### 2. Event Types ที่รองรับ
- **Message Events**: รับข้อความจากผู้ใช้
- **Postback Events**: รับข้อมูลจาก buttons/templates
- **Follow Events**: เมื่อผู้ใช้เพิ่ม bot
- **Unfollow Events**: เมื่อผู้ใช้บล็อก bot

### 3. Commands ที่รองรับ
- `จอง` หรือ `booking` - แสดงข้อมูลการจอง
- `ดูการจอง` หรือ `my booking` - แสดงรายการจองของผู้ใช้

### 4. Database Logging
- บันทึกข้อความทั้งหมดลงในตาราง `line_log`
- เก็บ `line_id`, `message`, และ `created_at`

## Flow การทำงาน (Webhook → ตอบกลับ)
1) LINE ส่ง event → `/api/webhook/line`
2) ระบบ verify signature ด้วย `LINE_CHANNEL_SECRET`
3) แยก event
   - message: ตรวจคำสั่ง/ข้อความ → ส่งข้อความ/Flex/Carousel
   - postback: ดึงข้อมูลจอง/FAQ ตาม action
   - follow: ส่งปุ่ม “จองคิว” พร้อมลิงก์
4) ตอบกลับ
   - มี replyToken → ใช้ Reply API (ภายใน 30 วินาที)
   - ไม่มี replyToken → fallback เป็น Push (ต้องมี userId)
5) บันทึก log ลง `line_log`

## API Endpoints

### POST `/api/webhook/line`
รับ webhook events จาก LINE

**Headers:**
- `x-line-signature`: LINE signature สำหรับ verification

**Body:**
```json
{
  "events": [
    {
      "type": "message",
      "replyToken": "reply_token",
      "source": {
        "type": "user",
        "userId": "user_id"
      },
      "timestamp": 1234567890,
      "message": {
        "type": "text",
        "id": "message_id",
        "text": "ข้อความ"
      }
    }
  ]
}
```

### GET `/api/webhook/line`
ตรวจสอบว่า webhook endpoint ทำงานอยู่

## การทดสอบ (สรุป)
- Local + ngrok: เปิด `ngrok http 3000` แล้วใส่ URL ใน LINE Console
- curl จำลอง event: ตัวอย่างด้านบน
- ตรวจ log invalid signature หาก signature ผิด

## Customization

คุณสามารถปรับแต่งการตอบกลับได้ในฟังก์ชัน `handleTextMessage()`:

```typescript
// เพิ่ม commands ใหม่
if (message.includes("คำสั่งของคุณ")) {
  return {
    type: "text",
    text: "ข้อความตอบกลับ",
  };
}
```

## Security Notes

1. **Signature Verification**: ตรวจสอบ signature ทุกครั้งเพื่อป้องกันการโจมตี
2. **Environment Variables**: อย่า commit `.env` file
3. **HTTPS**: ใช้ HTTPS ใน production

## Troubleshooting

### Error: "LINE_CHANNEL_SECRET is not set"
- ตรวจสอบว่าได้ตั้งค่า environment variable แล้ว
- Restart dev server หลังจากเพิ่ม environment variable

### Error: "Invalid signature"
- ตรวจสอบว่า Channel Secret ถูกต้อง
- ตรวจสอบว่า request body ไม่ถูกแก้ไขระหว่างทาง

### Webhook ไม่ได้รับ events
- ตรวจสอบว่า Webhook URL ถูกต้อง
- ตรวจสอบว่า Webhook ใน LINE Developers Console เปิดอยู่
- ตรวจสอบ logs ใน LINE Developers Console









