# Backoffice Domain Model

อ้างอิงจาก `prisma/schema.prisma` และมุมมองของผู้ใช้งานหลังบ้าน

## Branch
- แทน "สาขา" ของคลินิก
- ฟิลด์หลัก (จาก schema)
  - `id: String`
  - `name: String`
  - `location: String`
  - `image: String`
  - `availableServices: String` (JSON: รายการ service id ที่สาขานั้นให้บริการ)
- ความต้องการฝั่งหลังบ้าน
  - ต้องสามารถเปิด/ปิดสาขาชั่วคราวได้ (อาจต้องมีฟิลด์ `isActive` หรือ status เพิ่มในอนาคต)
  - Admin ต้องจัดการ mapping ว่าสาขาไหนมีบริการใดได้บ้าง

## Service
- แทน "รายการบริการ" เช่น นวดไทย 60 นาที, นวดประคบ ฯลฯ
- ฟิลด์หลัก
  - `id: String`
  - `name: String`
  - `description: String`
  - `duration: Int` (นาที)
  - `price: Float` (บาท)
  - `image: String`
- มุมมองหลังบ้าน
  - Backoffice ต้องสามารถเพิ่ม/แก้ไข/ปิดการใช้งาน service ได้
  - duration และ price เป็นตัวกำหนดเวลาช่องคิวและประมาณรายได้

## Staff
- แทนหมอนวด/ผู้ให้บริการ
- ฟิลด์หลัก
  - `id: String`
  - `name: String`
  - `role: String`
  - `image: String`
  - `specialty: String` (JSON: กลุ่มบริการที่ถนัด)
- มุมมองหลังบ้าน
  - ต้องรู้ว่า staff คนใดให้บริการอะไรได้บ้าง
  - สามารถพักงาน/ลาออก/ไม่พร้อมให้บริการชั่วคราวได้ (อาจต้องเพิ่ม status ใน schema ภายหลัง)

## StaffSchedule
- จัดการวันหยุดและช่องเวลาที่ไม่ว่างของแต่ละ staff
- ฟิลด์หลัก
  - `id: String`
  - `staffId: String @unique`
  - `offDays: String` (JSON: รายการวันที่หยุด)
  - `busySlots: String` (JSON: mapping วันที่ → รายการ time slot ที่ไม่ว่าง)
- มุมมองหลังบ้าน
  - Backoffice ต้องสามารถเห็นปฏิทินและแก้ไขวันหยุด/ช่วงเวลาไม่ว่างของ staff
  - ใช้ในการป้องกัน overbooking ฝั่ง front-office

## Booking
- แทนการจองคิวของลูกค้า
- ฟิลด์หลัก
  - `id: String`
  - `branchId: String`
  - `serviceId: String`
  - `staffId: String`
  - `date: DateTime`
  - `time: String`
  - `customerName: String`
  - `customerPhone: String`
  - `status: String` (ค่าเริ่มต้น "confirmed"; ใช้ค่า `completed`, `cancelled` ตาม process)
  - `createdAt: DateTime`
  - `updatedAt: DateTime`
- มุมมองหลังบ้าน
  - เห็นรายการจองทั้งหมดแบบ filter ตามวันที่/สาขา/บริการ/สถานะ
  - สามารถปรับ `status` ได้ (เช่น เมื่อลูกค้ามาใช้บริการจริง หรือโทรมายกเลิก)

## ShopConfig
- กำหนดค่า global ของร้าน
- ฟิลด์หลัก
  - `id: String`
  - `openTime: Int`
  - `closeTime: Int`
  - `holidays: String` (JSON: รายการวันหยุด)
  - `slotInterval: Int`
- มุมมองหลังบ้าน
  - Admin ต้องแก้ไขเวลาทำการ วันหยุด และความละเอียดของ slot ได้จากหน้า setting ส่วนกลาง

## Entity ที่สเปกเสนอเพิ่ม (ยังไม่มีใน schema)
- AdminUser / BackofficeUser
  - เก็บบัญชีผู้ใช้ของผู้ดูแลหลังบ้าน (role, ชื่อ, สาขาที่สังกัด ฯลฯ)
  - ใช้ผูกกับระบบ auth ปัจจุบันของแอป (ยังไม่กำหนดรายละเอียดที่นี่ แต่ระบุ requirement ไว้ในสิทธิ์การใช้งาน)
