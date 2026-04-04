# Backoffice API (High-level)

> หมายเหตุ: ยังไม่กำหนดเส้นทาง (route) ที่ตายตัว เพื่อให้ทีมพัฒนามีอิสระในการออกแบบตาม Next.js App Router แต่สเปกนี้กำหนด "contract" เชิงข้อมูล/พฤติกรรม

## Branch API
- List Branches
  - Input: filter เบื้องต้น (เช่น status)
  - Output: รายการ Branch พร้อม `availableServices`
- Create/Update Branch
  - Input: ข้อมูลสาขา + mapping services
  - Behavior: validate ข้อมูล และบันทึกลง `Branch`

## Service API
- List Services
- Create/Update Service
- Toggle active/inactive

## Staff API
- List Staff (รองรับ filter ตามสาขา/role)
- Create/Update Staff
- Manage specialty (บริการที่ทำได้)

## StaffSchedule API
- Get Schedule by Staff
  - รวม `offDays` + `busySlots`
- Update Schedule
  - บันทึก JSON กลับ `StaffSchedule`

## Booking API
- List Bookings
  - filter: date range, branch, service, staff, status
- Get Booking Detail
- Update Booking Status
  - ปรับ `status` และ `updatedAt`
- (Option) Reschedule / Reassign Staff
  - ตรวจสอบ conflict กับ StaffSchedule ก่อนบันทึก

## ShopConfig API
- Get ShopConfig
- Update ShopConfig

## Auth & Authorization
- Backoffice API ทุกตัวต้องผูกกับระบบ auth ปัจจุบัน (ยังไม่กำหนด detail ที่นี่)
- ต้องแนบข้อมูล role/branch ลงใน context เพื่อตรวจสิทธิ์ตาม matrix ใน `backoffice-permissions.md`
