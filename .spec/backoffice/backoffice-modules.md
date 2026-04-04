# Backoffice Modules

รายการ module/พื้นที่หลักของระบบหลังบ้าน

## 1. Dashboard
- สรุปรายการจองวันนี้ แยกตามสาขา/ช่วงเวลา
- สถานะของคิว (confirmed / completed / cancelled)
- Highlight ช่องเวลาที่แน่น (near full capacity)

## 2. Branch Management
- รายการสาขา (ตาราง)
  - ชื่อสาขา, ที่ตั้ง, รูปภาพ, สถานะ (active/inactive), จำนวนบริการที่เปิดให้บริการ
- ฟังก์ชัน
  - เพิ่ม/แก้ไข/ปิดการใช้งานสาขา
  - จัดการ `availableServices` ต่อสาขา

## 3. Service Management
- รายการบริการทั้งหมด
  - ชื่อบริการ, ระยะเวลา, ราคา, สถานะ (active/inactive)
- ฟังก์ชัน
  - CRUD service
  - ผูก service กับสาขา (หรือบริหารจาก Branch Management)

## 4. Staff Management
- รายชื่อ staff
  - ชื่อ, รูป, role, สาขา, specialty, สถานะการทำงาน
- ฟังก์ชัน
  - CRUD staff
  - กำหนดบริการที่แต่ละคนทำได้ (specialty)

## 5. Staff Schedule Management
- มุมมองปฏิทินต่อ staff
- ฟังก์ชัน
  - จัดการ `offDays`
  - จัดการ `busySlots` (เช่น บล็อกช่วงเวลาเพื่องานประชุม/อบรม)

## 6. Booking Management
- ตารางรายการจอง
  - filter ตาม วันที่, สาขา, บริการ, staff, status
- ฟังก์ชัน
  - ดูรายละเอียดการจอง
  - เปลี่ยนสถานะ (confirmed → completed / cancelled)
  - แก้ไข staff/เวลา กรณีพิเศษ (ตาม business rule ที่จะกำหนดใน Use Cases)

## 7. Shop Configuration
- หน้า setting กลาง
- ฟังก์ชัน
  - แก้ไข `openTime`, `closeTime`, `slotInterval`
  - กำหนด `holidays`

## 8. Reports (เบื้องต้น)
- รายงานจำนวนการจองตามช่วงเวลา/บริการ/สาขา
- ยังไม่กำหนดสคีมาเก็บข้อมูลเพิ่มเติม แต่สเปกนี้กันพื้นที่ไว้สำหรับเฟสถัดไป

## 9. User & Permission Management (เสนอเพิ่ม)
- กำหนดผู้ใช้ระบบหลังบ้านและ role
- ใช้ร่วมกับไฟล์ `backoffice-permissions.md`
