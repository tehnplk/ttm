# คู่มือการตั้งค่าระบบแจ้งเตือนการถึงเวลานัด

## ภาพรวม

ระบบแจ้งเตือนการถึงเวลานัดจะส่งข้อความผ่าน LINE ไปยังลูกค้าก่อนถึงเวลานัดตามที่ตั้งค่าไว้

## การตั้งค่า

### 1. ตั้งค่าผ่านหน้า Admin

1. เข้าสู่หน้า **Admin Console** → **ตั้งค่าการแจ้งเตือน** (`/admin/notifications`)
2. ตั้งค่าต่างๆ:
   - **เปิด/ปิดการแจ้งเตือน**: เลือกว่าจะเปิดหรือปิดการแจ้งเตือน
   - **เวลาที่จะส่งการแจ้งเตือน**: ระบุเวลา (HH:mm) ที่จะส่งการแจ้งเตือนทุกวัน
   - **จำนวนวันก่อนนัดที่จะแจ้งเตือน**: ระบุจำนวนวันก่อนถึงเวลานัด (แนะนำ: 1 วัน)
   - **ข้อความแจ้งเตือน**: ปรับแต่งข้อความที่ต้องการส่ง

### 2. ตัวแปรที่ใช้ในข้อความ

สามารถใช้ตัวแปรต่อไปนี้ในข้อความ:

- `{name}` - ชื่อผู้จอง
- `{date}` - วันที่นัด (เช่น 15 มกราคม 2567)
- `{time}` - เวลานัด (เช่น 09:00)
- `{branch}` - ชื่อสาขา

**ตัวอย่างข้อความ:**
```
สวัสดีครับ คุณ{name} มีนัดในวันพรุ่งนี้ (วันที่ {date}) เวลา {time} ที่ {branch} กรุณามาตามเวลานัดหมาย
```

### 3. ตั้งค่า Cron Job

ระบบต้องตั้งค่า cron job หรือ scheduled task เพื่อเรียก API endpoint สำหรับส่งการแจ้งเตือน

#### วิธีที่ 1: ใช้ Cron Job (Linux/Mac)

เพิ่มบรรทัดนี้ใน crontab:

```bash
# ส่งการแจ้งเตือนทุกวันเวลา 09:00 น.
0 9 * * * curl -X POST https://your-domain.com/api/admin/notifications/send -H "x-api-key: your-secret-api-key"
```

หรือใช้ `wget`:

```bash
0 9 * * * wget --post-data="" --header="x-api-key: your-secret-api-key" https://your-domain.com/api/admin/notifications/send
```

#### วิธีที่ 2: ใช้ Scheduled Task (Windows)

1. เปิด **Task Scheduler**
2. สร้าง **Basic Task**
3. ตั้งค่า:
   - **Trigger**: Daily, เวลาที่ต้องการ (เช่น 09:00)
   - **Action**: Start a program
   - **Program/script**: `curl`
   - **Arguments**: `-X POST https://your-domain.com/api/admin/notifications/send -H "x-api-key: your-secret-api-key"`

#### วิธีที่ 3: ใช้ Vercel Cron Jobs

หากใช้ Vercel สามารถตั้งค่าใน `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/admin/notifications/send",
      "schedule": "0 9 * * *"
    }
  ]
}
```

และสร้างไฟล์ `vercel.json` ใน root directory

#### วิธีที่ 4: ใช้ External Cron Service

ใช้บริการ cron job ภายนอก เช่น:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [Cronitor](https://cronitor.io)

ตั้งค่าให้เรียก URL:
```
POST https://your-domain.com/api/admin/notifications/send
Header: x-api-key: your-secret-api-key
```

### 4. ตั้งค่า Environment Variables

เพิ่ม environment variable สำหรับ API key:

```env
CRON_API_KEY=your-secret-api-key-here
```

**สำคัญ**: ใช้ API key ที่ปลอดภัยและไม่เปิดเผย

## API Endpoints

### GET /api/admin/notifications

ดึงข้อมูลการตั้งค่าการแจ้งเตือน

**Response:**
```json
{
  "id": 1,
  "enabled": "yes",
  "notificationTime": "09:00",
  "messageTemplate": "สวัสดีครับ คุณ{name} มีนัดในวันพรุ่งนี้...",
  "daysBefore": 1
}
```

### POST /api/admin/notifications

บันทึกการตั้งค่าการแจ้งเตือน

**Request Body:**
```json
{
  "enabled": "yes",
  "notificationTime": "09:00",
  "messageTemplate": "สวัสดีครับ คุณ{name} มีนัดในวันพรุ่งนี้...",
  "daysBefore": 1
}
```

### POST /api/admin/notifications/send

ส่งการแจ้งเตือน (เรียกจาก cron job)

**Headers:**
```
x-api-key: your-secret-api-key
```

**Response:**
```json
{
  "success": true,
  "message": "Notifications sent: 5, Failed: 0",
  "sent": 5,
  "failed": 0,
  "total": 5
}
```

## การทำงานของระบบ

1. **Cron job เรียก API** `/api/admin/notifications/send` ตามเวลาที่ตั้งไว้
2. **ระบบตรวจสอบการตั้งค่า** ว่าการแจ้งเตือนเปิดอยู่หรือไม่
3. **ระบบค้นหาการจอง** ที่ตรงกับเงื่อนไข:
   - วันที่นัด = วันนี้ + จำนวนวันที่ตั้งไว้
   - มี LINE ID
   - สถานะ = pending หรือ confirmed
4. **ระบบส่งข้อความ** ผ่าน LINE API ไปยังลูกค้าแต่ละคน
5. **บันทึก log** ลงในตาราง `line_log`

## เงื่อนไขการส่งการแจ้งเตือน

- ลูกค้าต้องมี LINE ID ในระบบ (`line_id` ไม่เป็น NULL)
- การจองต้องมีสถานะ `pending` หรือ `confirmed`
- วันที่นัดต้องตรงกับวันที่คำนวณ (วันนี้ + จำนวนวันที่ตั้งไว้)

## การทดสอบ

### ทดสอบการตั้งค่า

1. เข้าหน้า `/admin/notifications`
2. ตั้งค่าและบันทึก
3. ตรวจสอบว่าข้อมูลถูกบันทึกถูกต้อง

### ทดสอบการส่งการแจ้งเตือน

เรียก API โดยตรง:

```bash
curl -X POST https://your-domain.com/api/admin/notifications/send \
  -H "x-api-key: your-secret-api-key"
```

หรือใช้ Postman/Insomnia

## การแก้ไขปัญหา

### การแจ้งเตือนไม่ถูกส่ง

1. ตรวจสอบว่า cron job ทำงานหรือไม่
2. ตรวจสอบว่า `enabled` = "yes" หรือไม่
3. ตรวจสอบว่า LINE_CHANNEL_ACCESS_TOKEN ถูกตั้งค่าหรือไม่
4. ตรวจสอบ log ในตาราง `line_log`
5. ตรวจสอบว่า booking มี LINE ID หรือไม่

### ข้อผิดพลาดจาก LINE API

- ตรวจสอบว่า LINE_CHANNEL_ACCESS_TOKEN ถูกต้อง
- ตรวจสอบว่า LINE Bot มี permission ในการส่ง push message
- ตรวจสอบว่า user ยังไม่ได้บล็อก bot

## หมายเหตุ

- ระบบจะส่งการแจ้งเตือนเฉพาะลูกค้าที่มี LINE ID
- การแจ้งเตือนจะส่งตามเวลาที่ตั้งไว้ทุกวัน
- ระบบจะไม่ส่งการแจ้งเตือนซ้ำสำหรับการจองเดียวกัน









