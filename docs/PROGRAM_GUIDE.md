# เอกสารประกอบโปรแกรม (Program Guide)

## ภาพรวมสถาปัตยกรรม
- **Framework**: Next.js 16 (App Router) + React + TypeScript  
- **UI**: Tailwind CSS, lucide-react  
- **Data**: Prisma ORM ต่อฐานข้อมูลหลัก (เช่น MySQL/Postgres)  
- **Auth**: Middleware `/api/admin/*` ใช้ `requireApiAuth`  
- **Realtime**: SSE สำหรับอัปเดตการจองในหน้า Admin  
- **LINE**: Webhook `/api/webhook/line`, Push/Reply API, Notification jobs

## โครงสร้างหลักของโค้ด (ย่อ)
- `src/app/booking/` จองคิวฝั่งลูกค้า (flow หลายขั้น)  
- `src/app/admin/` หลังบ้านจัดการสาขา/บริการ/พนักงาน/การจอง/แจ้งเตือน  
- `src/components/` คอมโพเนนต์ UI reuse เช่น `Confirmation`, `SuccessScreen`  
- `src/app/api/` REST API & Webhook (admin, bookings, notifications, LINE)  
- `src/lib/` ยูทิลิตี้ Prisma, api-auth, booking-service  
- `docs/` คู่มือประกอบ เช่น LINE webhook setup, user guide

## การติดตั้ง (Step-by-step)
1) เตรียม environment  
   - คัดลอก `.env.example` เป็น `.env`  
   - เติมค่า:  
     - `DATABASE_URL` (เชื่อม DB)  
     - `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`  
     - `NEXT_PUBLIC_BOOKING_URL` (เช่น https://example.com หรือ ngrok URL)  
2) ติดตั้ง dependencies  
   ```bash
   pnpm install
   ```
3) จัดการฐานข้อมูล (Prisma)  
   ```bash
   pnpm prisma migrate deploy
   pnpm prisma db seed   # ถ้ามี seed
   ```
4) รัน Development  
   ```bash
   pnpm dev
   ```
5) รัน Production (ตัวอย่าง)  
   ```bash
   pnpm build
   pnpm start
   ```

## Flow การใช้งาน (End-to-End)
### ฝั่งลูกค้า (Booking Flow)
1) เข้าหน้า `/booking`  
2) เลือกสาขา → บริการ → วันที่ → ช่วงเวลา → พนักงาน  
3) กรอกชื่อ/นามสกุล, เบอร์มือถือ 10 หลัก (06/08/09)  
4) ยืนยันการจอง → หน้า Success แสดงเลข booking  
5) ผู้ใช้สามารถดู “รายการจองของฉัน” ได้ใน flow เดียวกัน

### ฝั่งแอดมิน (Admin Console)
1) เข้าหน้า `/admin` (มี middleware ตรวจ auth)  
2) เมนูหลัก: รายการจอง / สาขา / บริการ / พนักงาน / แจ้งเตือน / Broadcast  
3) รายการจอง: เพิ่ม/แก้ไข/ลบ, ยืนยันมาถึง, ส่งแจ้งเตือน LINE รายบุ๊กกิ้ง (ต้องมี lineId)  
4) ตั้งค่าแจ้งเตือน `/admin/notifications`: เปิด/ปิด, ตั้งเวลา, daysBefore, ทดสอบส่ง  
5) Broadcast `/admin/broadcasts`: ส่งข้อความ push รายคน (ตาม API key/เงื่อนไข)

### การแจ้งเตือนอัตโนมัติ (Notifications)
1) Cron/Trigger เรียก `POST /api/admin/notifications/send`  
2) ระบบโหลด settings (enabled/time/daysBefore)  
3) คำนวณวันนัด = วันนี้ + daysBefore  
4) ค้นหา booking ที่มี `line_id` และสถานะ pending/confirmed ของวันเป้าหมาย  
5) สร้าง Flex Message → ส่ง LINE Push → บันทึก log `line_log`

### LINE Webhook / Chat Flow
1) ผู้ใช้แชท LINE กับบอท → LINE ส่ง event มาที่ `/api/webhook/line`  
2) ระบบ verify signature → แยก event  
3) Message: คำสั่ง “จองคิว”, “ประวัติการจอง”, “คำถามพบบ่อย” → ตอบด้วย Reply (ถ้ามี replyToken) หรือ Push fallback  
4) Postback: ปุ่มเมนูหลัก → โหลดข้อมูลจาก DB → ตอบกลับด้วย Flex/Carousel  
5) Follow: ทักครั้งแรก → ส่งปุ่ม “จองคิว” พร้อมลิงก์

## การใช้งานฟีเจอร์หลัก
- **จองคิวฝั่งลูกค้า**: `/booking` (เลือกสาขา > บริการ > วัน/เวลา > พนักงาน > ยืนยัน)  
- **ดูคิวของฉัน**: ใน flow `/booking` เลือกแท็บ “รายการจองของคุณ”  
- **หลังบ้าน Admin**: `/admin`  
  - รายการจอง: เพิ่ม/แก้ไข/ลบ, ยืนยันลูกค้ามาถึง, ส่งแจ้งเตือน LINE รายบุ๊กกิ้ง  
  - สาขา/บริการ/พนักงาน: จัดการข้อมูลอ้างอิง  
  - ตั้งค่าแจ้งเตือน: `/admin/notifications` ตั้งเวลาส่ง LINE ล่วงหน้า, ทดสอบส่ง  
  - Broadcast: ส่งข้อความ LINE แบบ push รายคน (มี API key เงื่อนไข)  
- **Backoffice (viewer)**: `/backoffice/bookings` อ่านรายการจอง

## LINE Integration
- **Webhook**: `POST /api/webhook/line` (ลงใน LINE Developers > Messaging API > Webhook URL)  
  - รองรับ message / postback / follow events  
  - คำสั่งหลัก: “จองคิว”, “ประวัติการจอง”, “คำถามพบบ่อย”  
- **Reply vs Push**: ใช้ reply token ถ้ามี; ถ้าไม่มี fallback เป็น push (ต้องมี userId)  
- **Notification Job (manual trigger)**: `POST /api/admin/notifications/send` ส่งแจ้งเตือนตาม daysBefore  
- **Specific Booking Push**: `POST /api/admin/bookings/{id}/send-notification`

## Workflows สำคัญ
- **Booking Flow (ลูกค้า)**  
  1) BranchSelection → ServiceSelection → DateSelection → TimeSelection → StaffSelection → Confirmation → Success  
  2) Validation: เบอร์มือถือ 10 หลัก (06/08/09), ชื่อ/นามสกุลแยกและรวมบันทึกเป็น `customerName`
- **Admin Bookings**  
  - SSE อัปเดตเมื่อมี booking ใหม่  
  - ยืนยันมาถึง/ยกเลิกยืนยัน เปลี่ยนสถานะและบันทึก confirmDatetime  
  - ปุ่มส่งแจ้งเตือน LINE รายบุ๊กกิ้ง (ต้องมี lineId)

## คำสั่งที่ใช้บ่อย
```bash
pnpm lint          # เช็กโค้ด
pnpm test          # ถ้ามีชุดทดสอบ
pnpm dev           # รัน dev server
pnpm build && pnpm start   # รัน production
```

## การดีพลอย (สรุป)
- ตั้งค่า `.env` ครบบนเซิร์ฟเวอร์/บริการโฮสต์ (เช่น Vercel)  
- รัน `pnpm install && pnpm build`  
- แนบ `DATABASE_URL` และตัวแปร LINE ทั้งหมด  
- ตรวจสอบว่า webhook URL เข้าถึงได้ผ่าน HTTPS

## การแก้ไขปัญหา (Troubleshooting)
- **LINE ไม่ตอบกลับ**: ตรวจ `LINE_CHANNEL_SECRET / ACCESS_TOKEN`, ดู log invalid signature, ตรวจ reply token หมดอายุ (30 วินาที)  
-.notification ไม่ส่ง: ตรวจว่า enabled = yes, daysBefore/time ถูกต้อง, booking มี line_id, token ไม่หมดอายุ  
- Build fail: ตรวจเวอร์ชัน Node/PNPM, ลองลบ `.next` และ `pnpm install` ใหม่

---
เอกสารอื่นที่เกี่ยวข้อง:  
- `docs/LINE_WEBHOOK_SETUP.md` (ตั้งค่า LINE)  
- `docs/NOTIFICATION_SETUP.md` (ระบบแจ้งเตือน)  
- `docs/user-guide.md` (คู่มือการใช้งานฝั่งผู้ใช้)

