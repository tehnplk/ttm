# Backoffice Use Cases

## รูปแบบสั้น
- Actor
- Precondition
- Main Flow
- Alternate / Error Flow

---

## UC-BO-01: Admin จัดการสาขา
- Actor: Admin
- Precondition:
  - เข้าสู่ระบบหลังบ้านสำเร็จ
- Main Flow:
  1. Admin เปิดหน้า Branch Management
  2. ระบบแสดงรายการสาขาทั้งหมดจากตาราง `Branch`
  3. Admin กด "เพิ่มสาขา" หรือเลือกสาขาที่มีอยู่เพื่อแก้ไข
  4. กรอก/แก้ไขข้อมูล `name`, `location`, `image`, สถานะ (active/inactive)
  5. เลือกบริการที่สาขานั้นมี (`availableServices`)
  6. กดบันทึก
- Alternate / Error Flow:
  - ถ้าข้อมูลไม่ครบหรือผิดรูปแบบ ระบบแสดง validation error และไม่บันทึก

## UC-BO-02: Admin จัดการบริการ
- Actor: Admin
- Precondition: เข้าสู่ระบบแล้ว
- Main Flow:
  1. เปิดหน้า Service Management
  2. เห็นรายการบริการทั้งหมดจากตาราง `Service`
  3. เพิ่ม/แก้ไขชื่อบริการ, description, duration, price, image, สถานะ
  4. บันทึกข้อมูล
- Alternate / Error Flow:
  - duration หรือ price ผิดรูปแบบ → แจ้ง error

## UC-BO-03: Admin จัดการพนักงาน/หมอนวด
- Actor: Admin
- Precondition: เข้าสู่ระบบแล้ว
- Main Flow:
  1. เปิดหน้า Staff Management
  2. เห็นรายการ staff ทั้งหมดจากตาราง `Staff`
  3. เพิ่ม/แก้ไขชื่อ, role, image, specialty, status
  4. บันทึกข้อมูล

## UC-BO-04: จัดการวันหยุดและตารางไม่ว่างของ staff
- Actor: Admin / Supervisor สาขา
- Precondition: staff มี record ใน `Staff`
- Main Flow:
  1. เปิดหน้า Staff Schedule
  2. เลือก staff คนหนึ่ง
  3. ระบบดึงข้อมูล `offDays` และ `busySlots` จาก `StaffSchedule`
  4. ผู้ใช้เพิ่ม/ลบวันหยุด หรือบล็อกเวลา
  5. ระบบบันทึกกลับไปยัง `StaffSchedule`

## UC-BO-05: ดูและจัดการรายการจอง
- Actor: Admin / Staff หน้าร้าน
- Precondition: มีข้อมูล `Booking` อย่างน้อยหนึ่งรายการ
- Main Flow:
  1. เปิดหน้า Booking Management
  2. filter ตามวันที่/สาขา/บริการ/สถานะ
  3. เลือก booking หนึ่งรายการเพื่อดูรายละเอียด
  4. เปลี่ยนสถานะเป็น `completed` หรือ `cancelled` ตามเหตุการณ์จริง
  5. กดบันทึก ระบบอัปเดต `status` และ `updatedAt`
- Alternate / Error Flow:
  - การเปลี่ยนแปลงที่ทำให้เกิด conflict กับตาราง staff (เช่น เปลี่ยนเวลาไปช่วงที่มี busy slot) → ระบบต้องเตือนและไม่ให้บันทึก

## UC-BO-06: ปรับค่าร้าน (ShopConfig)
- Actor: Admin
- Precondition: shop มี record ใน `ShopConfig`
- Main Flow:
  1. เปิดหน้า Shop Configuration
  2. ระบบแสดงค่า `openTime`, `closeTime`, `slotInterval`, `holidays`
  3. Admin ปรับค่าใหม่ แล้วบันทึก
  4. การคำนวณช่องเวลาในระบบจองต้องสะท้อนค่าล่าสุด

## UC-BO-07: รายงานเบื้องต้น
- Actor: Admin
- Precondition: มีข้อมูล Booking
- Main Flow:
  1. เปิดหน้า Reports
  2. เลือกช่วงวันที่/สาขา/บริการ
  3. ระบบแสดงสรุปจำนวนการจองต่อวัน/บริการ/สาขา

(Use case เพิ่มเติมสามารถต่อยอดจากโครงนี้ เช่น การย้ายคิว ย้าย staff หรือการบันทึกเหตุผลการยกเลิก)
