# คู่มือการใช้งานระบบจองคิว “กมลาศรม สสจ.พิษณุโลก”

> ไฟล์นี้เป็น Markdown สามารถแก้ไขได้ใน VS Code / Cursor หรือเปิดใน Word/Google Docs แล้วแปลงเป็น .docx ได้

## 1) การติดตั้งและเตรียมระบบ
1. ติดตั้ง Node.js (แนะนำ LTS) และ npm
2. ตั้งค่า Environment ในไฟล์ `.env` (ตัวอย่างคีย์สำคัญ)
   - `DATABASE_URL` = URL MySQL
   - `NEXTAUTH_URL` = http://localhost:3000
   - `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET`
   - `CRON_API_KEY` (สำหรับ webhook/cron)
   - `NEXT_PUBLIC_BOOKING_URL` = URL หน้าจอง
3. ติดตั้ง dependency  
   ```bash
   npm install
   ```
4. รัน Migration (ถ้ายังไม่รัน)
   ```bash
   mysql -u user -p dbname < prisma/migrations/create_faq_table.sql
   mysql -u user -p dbname < prisma/migrations/insert_default_faqs.sql
   mysql -u user -p dbname < prisma/migrations/add_nickname_and_employee_number_to_employee.sql
   # อื่นๆ ตามไฟล์ใน prisma/migrations
   ```
5. สร้าง Prisma Client  
   ```bash
   npx prisma generate
   ```

## 2) การรันระบบ
- โหมดพัฒนา: `npm run dev`
- โหมดโปรดักชัน: `npm run build` แล้ว `npm run start`

## 3) บทบาทและการล็อกอิน
- Public: จองคิว / ตรวจสอบการจอง ไม่ต้องล็อกอิน
- Admin: `/admin` (ต้องมีสิทธิ์)  
  ฟีเจอร์หลัก: การแจ้งเตือน, Broadcast, สตาฟ, บริการ, สาขา, FAQ, รายงาน
- Backoffice: `/backoffice` (สำหรับทีมภายใน)

## 4) ฟีเจอร์หลัก
### 4.1 การจองคิว (ผู้ใช้ทั่วไป)
- หน้า `/booking`
- ขั้นตอน: เลือกสาขา → บริการ → วันที่/เวลา → พนักงาน → กรอกข้อมูล → ยืนยัน
- ระบบกันจองซ้ำพนักงานถ้ามีจองช่วงเวลานั้นแล้ว (ปุ่มจะถูกปิดและแจ้ง “มีจองแล้ว”)

### 4.2 การแจ้งเตือน (Admin)
- หน้า `/admin/notifications`
- ตั้งค่าเวลาแจ้งเตือน, วันล่วงหน้า, เปิด/ปิด
- ข้อความแจ้งเตือนถูกส่งแบบ Flex Message ไป LINE พร้อมข้อมูลนัด และข้อความ “กรุณามาถึงก่อนเวลา 15 นาที”
- ทดสอบส่ง/ตั้งเวลาได้ (Cron ใช้ `CRON_API_KEY`)

### 4.3 คำถามพบบ่อย (FAQ)
- หน้า `/admin/faq` เพิ่ม/แก้ไข/ลบ FAQ
- LINE webhook ดึง FAQ จากฐานข้อมูลและแสดงเป็น Flex Carousel
- มี default FAQ 3 รายการจาก `insert_default_faqs.sql`

### 4.4 Broadcast LINE
- หน้า `/admin/broadcasts`
- ส่งข้อความถึงผู้ใช้ที่มี `line_id` ใน booking (ใช้ API `/api/admin/broadcasts/send`)

### 4.5 สตาฟและพนักงาน
- หน้า `/admin/staff`
- ฟิลด์เพิ่มเติม: รูป, nickname, employee_number, branch, position
- ลบเป็น soft delete (is_active = no) และ GET กรองเฉพาะ active

### 4.6 การตั้งค่าอื่นๆ
- `/admin/settings` ตั้งค่าเวลาเปิด-ปิด, slot, วันหยุด
- `/admin/opening-hours` แปลงเวลาที่พิมพ์ด้วยจุด “.” เป็น “:”

## 5) Webhook LINE
- ไฟล์: `src/app/api/webhook/line/route.ts`
- รองรับเมนู:
  - จองคิว (Flex สวยงาม)
  - ประวัติการจอง (Flex carousel)
  - คำถามพบบ่อย (Flex carousel จาก DB)
- ตรวจสอบ signature ด้วย `LINE_CHANNEL_SECRET`

## 6) นำเข้าข้อมูลพนักงาน
- สคริปต์: `scripts/import-employees-from-web.ts`
- รัน: `npm run import-employees`
- ดึงภาพ, ชื่อเล่น, employee_number จากเว็บต้นทางแล้วบันทึก DB และภาพที่ `public/images`

## 7) จุดที่แก้ไข/ข้อควรทราบล่าสุด
- กันการจองซ้ำของพนักงานตามวัน-เวลา (StaffSelection + /api/staff)
- ยืนยันการมาผู้ป่วย: คงค่า `line_id` ไม่ให้หายเมื่ออัปเดต
- แจ้งเตือน LINE ใช้ Flex พร้อมข้อความเตือน “กรุณามาถึงก่อนเวลา 15 นาที”
- เปลี่ยนชื่อแบรนด์เป็น “กมลาศรม สสจ.พิษณุโลก” ในทุกจุด UI หลัก

## 8) การทดสอบเบื้องต้น
- `npm run lint` (ถ้ามี)
- ทดสอบจองคิวครบ flow (เลือกพนักงานที่ไม่ถูกปิดด้วย “มีจองแล้ว”)
- ทดสอบแจ้งเตือน (POST ไป `/api/admin/notifications/send` พร้อม CRON_API_KEY ถ้าตั้งไว้)
- ทดสอบ LINE webhook (จองคิว, ประวัติการจอง, FAQ)

## 9) การปรับแต่ง/ส่งมอบ
- สามารถคัดลอกไฟล์นี้ไป Word/Google Docs เพื่อส่งมอบลูกค้า
- แก้ไขค่า ENV ให้ตรงกับเซิร์ฟเวอร์จริงก่อน deploy
- ตรวจสอบ cron หรือบริการที่ยิง `/api/admin/notifications/send` ให้ทำงานตามเวลาที่ตั้ง

---
หากต้องการรายละเอียดเชิงลึกเพิ่มเติม (เช่น ERD, Flow API, รายการ ENV ทั้งหมด) โปรดระบุ แล้วจะเพิ่มให้ในเอกสารนี้


