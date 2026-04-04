# สรุป Feature ระบบจองคิว

## 📋 ภาพรวม
ระบบจองคิวออนไลน์สำหรับบริการนวดแผนไทย พร้อมการแจ้งเตือนผ่าน LINE และระบบจัดการหลังบ้านที่ครบถ้วน

---

## 🎯 Feature หลัก

### 1. ระบบจองคิว (Booking System)

#### 1.1 การจองคิวฝั่งลูกค้า
- **หน้า**: `/booking`
- **Flow**: 
  1. เลือกสาขา
  2. เลือกบริการ
  3. เลือกวันที่
  4. เลือกช่วงเวลา (Time Slot)
  5. เลือกพนักงาน
  6. กรอกข้อมูลลูกค้า (ชื่อ, นามสกุล, เบอร์โทรศัพท์)
  7. ยืนยันการจอง
  8. แสดงหน้า Success พร้อมเลขที่จอง
- **Validation**:
  - เบอร์โทรศัพท์: 10 หลัก ต้องขึ้นต้นด้วย 06, 08, หรือ 09
  - ชื่อและนามสกุล: แยกกรอก แต่รวมเป็น `customerName` เมื่อบันทึก
- **ป้องกันการจองซ้ำ**: ระบบจะปิดปุ่มพนักงานที่ถูกจองแล้วในช่วงเวลานั้น

#### 1.2 ดูรายการจองของฉัน
- **หน้า**: `/my-bookings` หรือใน flow `/booking`
- **ฟีเจอร์**:
  - ค้นหาด้วยเบอร์โทรศัพท์
  - แสดงรายการจองทั้งหมดของผู้ใช้
  - แสดงสถานะการจอง (ยืนยันแล้ว, เสร็จสิ้น, ยกเลิก)
  - แสดงรายละเอียด: วันที่, เวลา, สาขา, บริการ, พนักงาน

---

### 2. ระบบจัดการหลังบ้าน (Admin Console)

#### 2.1 รายการจอง (`/admin/bookings`)
- **ฟีเจอร์**:
  - **เพิ่มการจอง**: สร้างการจองใหม่ด้วยมือ
  - **แก้ไขการจอง**: แก้ไขข้อมูลการจองทั้งหมด
  - **ลบการจอง**: ลบการจองออกจากระบบ
  - **ยืนยันการมาถึง**: เปลี่ยนสถานะเป็น "เสร็จสิ้น" และบันทึก `confirm_datetime`
  - **ยกเลิกการยืนยัน**: เปลี่ยนกลับเป็นสถานะเดิม
  - **ส่งแจ้งเตือน LINE**: ส่งแจ้งเตือนให้การจองเฉพาะรายการ (ต้องมี LINE ID)
  - **ค้นหา**: ค้นหาด้วยชื่อลูกค้า, เบอร์โทร, สาขา, บริการ, พนักงาน, สถานะ
  - **กรองตามสาขา**: กรองรายการจองตามสาขา
  - **Real-time Update**: ใช้ SSE (Server-Sent Events) อัปเดตรายการจองอัตโนมัติเมื่อมีการจองใหม่
  - **2 มุมมอง**:
    - **รายการจอง**: แสดงเป็นตารางรายการทั้งหมด
    - **รายการจองรายวัน**: แสดงเป็นตารางตามวันและพนักงาน (เหมือนตารางเวลา)

#### 2.2 จัดการสาขา (`/admin/branches`)
- เพิ่ม/แก้ไข/ลบสาขา
- จัดการข้อมูลสาขา (ชื่อ, ที่อยู่, เบอร์โทร, ฯลฯ)

#### 2.3 จัดการบริการ (`/admin/services`)
- เพิ่ม/แก้ไข/ลบบริการ
- ตั้งราคา, รายละเอียดบริการ

#### 2.4 จัดการพนักงาน (`/admin/staff`)
- เพิ่ม/แก้ไข/ลบพนักงาน
- อัปโหลดรูปภาพพนักงาน
- ตั้งค่า nickname, employee_number, branch, position
- **Soft Delete**: ลบเป็น soft delete (`is_active = no`) และ GET กรองเฉพาะ active

#### 2.5 จัดการเวลาเปิด-ปิด (`/admin/opening-hours`)
- ตั้งค่าเวลาเปิด-ปิดของแต่ละสาขา
- จัดการช่วงเวลา (Time Slots) สำหรับการจอง

#### 2.6 คำถามพบบ่อย (FAQ) (`/admin/faq`)
- เพิ่ม/แก้ไข/ลบ FAQ
- ตั้งค่าลำดับการแสดงผล
- เปิด/ปิดการแสดงผล
- LINE webhook ดึง FAQ จากฐานข้อมูลและแสดงเป็น Flex Carousel

#### 2.7 Dashboard (`/admin`)
- แสดงภาพรวมการจอง
- สถิติการใช้งาน

#### 2.8 Reports (`/admin/reports`)
- รายงานการจอง
- สถิติต่างๆ

#### 2.9 Schedule (`/admin/schedule`)
- จัดการตารางเวลาพนักงาน

#### 2.10 Staff Holidays (`/admin/staff-holidays`)
- จัดการวันหยุดพนักงาน

#### 2.11 Users (`/admin/users`)
- จัดการผู้ใช้ระบบ

#### 2.12 Settings (`/admin/settings`)
- ตั้งค่าระบบทั่วไป

---

### 3. ระบบแจ้งเตือน (Notification System)

#### 3.1 ตั้งค่าการแจ้งเตือน (`/admin/notifications`)
- **เปิด/ปิดการแจ้งเตือน**: เปิดหรือปิดการแจ้งเตือนอัตโนมัติ
- **ตั้งเวลาแจ้งเตือน**: ระบุเวลา (HH:mm) ที่จะส่งการแจ้งเตือนทุกวัน
- **จำนวนวันก่อนนัด**: ระบุจำนวนวันก่อนถึงเวลานัดที่จะแจ้งเตือน (แนะนำ: 1 วัน)
- **ทดสอบส่ง**: ทดสอบส่งการแจ้งเตือนทันที
- **Flex Message**: ส่งข้อความแจ้งเตือนเป็น Flex Message ที่สวยงามพร้อมรายละเอียดการจอง

#### 3.2 การแจ้งเตือนอัตโนมัติ
- **Trigger**: Cron job หรือ manual trigger เรียก `POST /api/admin/notifications/send`
- **กระบวนการ**:
  1. ตรวจสอบการตั้งค่า (enabled/time/daysBefore)
  2. คำนวณวันนัด = วันนี้ + daysBefore
  3. ค้นหา booking ที่มี `line_id` และสถานะ pending/confirmed ของวันเป้าหมาย
  4. สร้าง Flex Message พร้อมข้อมูลการจอง
  5. ส่ง LINE Push Message
  6. บันทึก log ใน `line_log`

#### 3.3 ส่งแจ้งเตือนรายการจองเฉพาะ
- **API**: `POST /api/admin/bookings/{id}/send-notification`
- **ฟีเจอร์**: ส่งแจ้งเตือน LINE ให้การจองเฉพาะรายการ
- **เงื่อนไข**: ต้องมี LINE ID ในระบบ

---

### 4. ระบบ Broadcast (`/admin/broadcasts`)

#### 4.1 ส่งข้อความ Broadcast
- ส่งข้อความ LINE แบบ push ถึงผู้ใช้ที่มี `line_id` ใน booking
- ตั้งค่าวันที่และเวลาส่ง
- กรองตามสาขา (branchIds)
- เปิด/ปิดการส่ง
- ติดตามสถานะการส่ง (sent/sentAt)

#### 4.2 API
- `POST /api/admin/broadcasts`: สร้าง broadcast ใหม่
- `POST /api/admin/broadcasts/send`: ส่ง broadcast
- `GET /api/admin/broadcasts/{id}/recipients`: ดูรายชื่อผู้รับ

---

### 5. LINE Integration

#### 5.1 LINE Webhook (`/api/webhook/line`)
- **Event Types ที่รองรับ**:
  - **Message Events**: รับข้อความจากผู้ใช้
  - **Postback Events**: รับข้อมูลจาก buttons/templates
  - **Follow Events**: เมื่อผู้ใช้เพิ่ม bot
  - **Unfollow Events**: เมื่อผู้ใช้บล็อก bot

#### 5.2 คำสั่ง LINE Bot
- **"จองคิว"** หรือ **"1"**: แสดง Flex Message พร้อมปุ่มจองคิว
- **"ประวัติการจอง"** หรือ **"2"**: แสดงรายการจองของผู้ใช้ (Carousel)
- **"คำถามพบบ่อย"** หรือ **"3"**: แสดง FAQ (Carousel)
- **Default**: แสดงเมนูหลักพร้อมปุ่มเลือก

#### 5.3 Reply vs Push Message
- **Reply Message**: ใช้เมื่อมี `replyToken` (แนะนำ, ใช้ได้ภายใน 30 วินาที)
- **Push Message**: ใช้เมื่อไม่มี `replyToken` หรือ reply ล้มเหลว (fallback)

#### 5.4 Signature Verification
- ตรวจสอบ signature จาก LINE เพื่อความปลอดภัย
- ใช้ HMAC-SHA256 algorithm

#### 5.5 Database Logging
- บันทึกข้อความทั้งหมดลงในตาราง `line_log`
- เก็บ `line_id`, `message`, และ `created_at`

---

### 6. Backoffice (Viewer Mode)

#### 6.1 ดูรายการจอง (`/backoffice/bookings`)
- ดูรายการจองทั้งหมด (อ่านอย่างเดียว)
- ไม่สามารถแก้ไขหรือลบได้

#### 6.2 ดูข้อมูลอื่นๆ
- สาขา, บริการ, พนักงาน, Reports, Schedule, Settings

---

### 7. Authentication & Authorization

#### 7.1 Admin Authentication
- Middleware ตรวจสอบ auth สำหรับ `/api/admin/*`
- ใช้ `requireApiAuth` function
- ต้องมี API key หรือ token ที่ถูกต้อง

#### 7.2 User Authentication
- Login/Register
- LINE Login
- Google Login (ถ้ามี)

---

### 8. Real-time Features

#### 8.1 Server-Sent Events (SSE)
- อัปเดตรายการจองอัตโนมัติในหน้า Admin
- เมื่อมีการจองใหม่ ระบบจะส่ง event ไปยัง client ทันที
- Fallback เป็น polling ถ้า SSE ล้มเหลว

#### 8.2 WebSocket (ถ้ามี)
- Socket.io สำหรับ real-time communication

---

## 🛠️ Technical Features

### 1. Database
- **ORM**: Prisma
- **Database**: MySQL/PostgreSQL
- **Migrations**: Prisma Migrate
- **Seed**: Prisma Seed

### 2. Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React, Iconify
- **State Management**: React Context API

### 3. Backend
- **API**: Next.js API Routes
- **Validation**: TypeScript types
- **Error Handling**: Try-catch with proper error messages

### 4. LINE Integration
- **Webhook**: `/api/webhook/line`
- **Push API**: LINE Messaging API
- **Reply API**: LINE Messaging API
- **Flex Message**: LINE Flex Message format

### 5. File Upload
- **API**: `/api/admin/upload`
- อัปโหลดรูปภาพพนักงาน
- จัดเก็บใน `public/images/`

---

## 📱 User Experience Features

### 1. Responsive Design
- รองรับทั้ง Desktop และ Mobile
- UI/UX ที่สวยงามและใช้งานง่าย

### 2. Loading States
- แสดง loading spinner ขณะโหลดข้อมูล
- แสดง loading state ขณะส่งข้อมูล

### 3. Error Handling
- แสดง error message ที่เข้าใจง่าย
- Validation feedback ทันที

### 4. Success Feedback
- แสดง success message หลังการกระทำสำเร็จ
- หน้า Success หลังการจองสำเร็จ

---

## 🔒 Security Features

### 1. API Authentication
- Middleware ตรวจสอบ auth สำหรับ admin routes
- API key validation

### 2. LINE Signature Verification
- ตรวจสอบ signature จาก LINE webhook
- ป้องกันการโจมตี

### 3. Input Validation
- Validate ข้อมูลก่อนบันทึก
- Sanitize user input

### 4. Environment Variables
- เก็บ sensitive data ใน `.env`
- ไม่ commit `.env` file

---

## 📊 Reporting & Analytics

### 1. Reports (`/admin/reports`)
- รายงานการจอง
- สถิติการใช้งาน
- ข้อมูลการจองตามช่วงเวลา

### 2. Dashboard
- ภาพรวมการจอง
- สถิติแบบ real-time

---

## 🔄 Integration Features

### 1. LINE Messaging API
- Webhook integration
- Push/Reply messages
- Flex Messages
- Carousel messages

### 2. External Services
- LINE Login (ถ้ามี)
- Google Login (ถ้ามี)

---

## 📝 Logging & Monitoring

### 1. LINE Logs
- บันทึกข้อความ LINE ทั้งหมดใน `line_log`
- ติดตามการส่งข้อความ

### 2. Error Logging
- Console logging สำหรับ debugging
- Error tracking

---

## 🎨 Customization Features

### 1. FAQ Management
- เพิ่ม/แก้ไข/ลบ FAQ
- ตั้งค่าลำดับการแสดงผล
- เปิด/ปิดการแสดงผล

### 2. Notification Templates
- Flex Message template สำหรับการแจ้งเตือน
- Customizable message format

### 3. Branding
- ชื่อแบรนด์: "กมลาศรม สสจ.พิษณุโลก"
- Customizable UI colors

---

## 📚 Documentation

### 1. User Guides
- `docs/user-guide.md`: คู่มือการใช้งานฝั่งผู้ใช้
- `docs/user-guide-user.md`: คู่มือผู้ใช้แบบละเอียด

### 2. Technical Documentation
- `docs/PROGRAM_GUIDE.md`: เอกสารประกอบโปรแกรม
- `docs/LINE_WEBHOOK_SETUP.md`: คู่มือตั้งค่า LINE Webhook
- `docs/NOTIFICATION_SETUP.md`: คู่มือตั้งค่าระบบแจ้งเตือน
- `docs/AUTH_SETUP.md`: คู่มือตั้งค่า Authentication

---

## 🚀 Performance Features

### 1. Optimizations
- Server-side rendering (SSR)
- Static generation where possible
- Image optimization

### 2. Caching
- Database query optimization
- API response caching

---

## 🔧 Maintenance Features

### 1. Database Management
- Prisma migrations
- Database seeding
- Backup and restore

### 2. Scripts
- `import-employees`: Import พนักงานจากระบบเดิม
- Custom scripts for data migration

---

## 📋 Summary

ระบบจองคิวนี้มี feature ครบถ้วนสำหรับ:
- ✅ การจองคิวออนไลน์
- ✅ การจัดการหลังบ้าน
- ✅ การแจ้งเตือนผ่าน LINE
- ✅ LINE Bot integration
- ✅ Real-time updates
- ✅ Reporting & Analytics
- ✅ User management
- ✅ Security & Authentication

เหมาะสำหรับธุรกิจบริการที่ต้องการระบบจองคิวที่ทันสมัยและใช้งานง่าย

