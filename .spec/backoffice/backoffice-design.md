# Backoffice Design

> เอกสารนี้เป็นข้อเสนอด้านสถาปัตยกรรม/โครงสร้าง (design) สำหรับฝั่ง backoffice ของระบบจองคลินิกแผนไทย วสส.พล โดยอิงจากสเปก business และโดเมนในไฟล์อื่น ๆ ภายใต้ `.spec/backoffice`

## 1. ภาพรวมสถาปัตยกรรม
- **Frontend Framework**: Next.js 16 (App Router) + React 19 + Tailwindcss
- **Backend Layer**: Next.js Route Handlers / Server Actions + Prisma 5 (SQLite)
- **การเข้าถึงฐานข้อมูล**: ผ่าน Prisma client เท่านั้น ไม่เรียก SQL ตรงจาก UI
- **การแบ่งส่วนระบบ**
  - Front-office: หน้า booking สำหรับลูกค้า
  - Backoffice: หน้าจัดการสำหรับ Admin/Staff (แยกเส้นทางชัดเจน)

ข้อเสนอ: ใช้ namespace `/backoffice` เป็นจุดเริ่มต้นของทุกหน้าหลังบ้าน
- ตัวอย่างโครงสร้างโฟลเดอร์ (ข้อเสนอ)
  - `src/app/backoffice/layout.tsx` — layout หลักของระบบหลังบ้าน (sidebar, header, auth guard)
  - `src/app/backoffice/page.tsx` — Dashboard
  - `src/app/backoffice/branches/page.tsx`
  - `src/app/backoffice/services/page.tsx`
  - `src/app/backoffice/staff/page.tsx`
  - `src/app/backoffice/schedule/page.tsx`
  - `src/app/backoffice/bookings/page.tsx`
  - `src/app/backoffice/settings/page.tsx` (ShopConfig)
  - `src/app/backoffice/reports/page.tsx`

## 2. Routing & Layout

### 2.1 Layout หลักของ Backoffice
- Layout ส่วนกลาง (`backoffice/layout.tsx`)
  - แสดง navigation/sidebar ที่ mapping กับ module ใน `backoffice-modules.md`
  - มี top bar สำหรับชื่อระบบ, สาขาที่เลือก, โปรไฟล์ผู้ใช้หลังบ้าน
  - ใช้ slot เดียวสำหรับเรนเดอร์ children page (Dashboard, Branches ฯลฯ)

### 2.2 การแบ่ง Route ตาม Module
- แต่ละ module ใช้ 1 route หลัก + route ย่อยเมื่อจำเป็น
  - `/backoffice/branches` — แสดงรายการสาขา + ฟอร์มเพิ่ม/แก้ไข (modal / side panel)
  - `/backoffice/services` — จัดการบริการ
  - `/backoffice/staff` — จัดการ staff
  - `/backoffice/schedule` — จัดตาราง/วันหยุดของ staff
  - `/backoffice/bookings` — ดู/กรอง/อัปเดต booking
  - `/backoffice/settings` — จัดการ ShopConfig
  - `/backoffice/reports` — รายงาน

## 3. Data Flow

### 3.1 แนวทางดึงข้อมูล
- ใช้ **Server Components** สำหรับเพจ/คอนเทนต์ที่เน้นแสดงข้อมูลจากฐานข้อมูลเป็นหลัก
- ใช้ **Server Actions หรือ Route Handlers** สำหรับการ mutate ข้อมูล
- ใช้ **Client Components** เฉพาะส่วน interaction หนัก ๆ (filter, form, table interaction, drag/drop ฯลฯ)

ลำดับทั่วไปของ data flow:
1. ผู้ใช้เปิดหน้า backoffice (เช่น `/backoffice/bookings`)
2. เพจฝั่ง server เรียก Prisma (ผ่านฟังก์ชัน service layer เช่น `getBookings(filter)`) เพื่อดึงข้อมูลที่จำเป็น
3. ส่งข้อมูลไปยัง Client Components สำหรับ rendering UI และ interaction
4. เมื่อผู้ใช้กดบันทึก/เปลี่ยนสถานะ/สร้างข้อมูลใหม่
   - เรียก server action หรือ POST ไปยัง route handler ใน namespace `/api/backoffice/...`
   - ตรวจสิทธิ์ (role/branch) ก่อนเขียนฐานข้อมูล
   - Prisma บันทึกลง model ที่เกี่ยวข้อง
   - เพจ revalidate หรือใช้ optimistic UI ตามความเหมาะสม

### 3.2 ตัวอย่างการแยกเลเยอร์ (เชิงแนวคิด)
- `src/lib/backoffice/branch-service.ts`
  - `listBranches(filter)`
  - `createOrUpdateBranch(payload)`
- `src/lib/backoffice/booking-service.ts`
  - `listBookings(filter)`
  - `updateBookingStatus(id, status)`

> จุดประสงค์: ให้เพจและ route handler ไม่ต้องถือ Prisma logic ตรง ๆ แต่เรียกผ่าน service layer ที่ทดสอบได้ง่ายกว่า

## 4. State Management ฝั่ง Backoffice

- **ระดับเพจ**: ใช้ React state ปกติ (`useState`, `useReducer`) + server props
- **ระดับระบบ (เช่น การเลือกสาขาปัจจุบัน)**
  - สามารถใช้ React Context เฉพาะ backoffice (เช่น `BackofficeContext`) ใน `backoffice/layout.tsx`
  - หรือใช้ URL param (`?branchId=`) เป็นแหล่งความจริง เพื่อลด global state
- หลีกเลี่ยงการดึงข้อมูลซ้ำซ้อนระหว่างเพจ หากข้อมูลเดียวกันใช้หลายจุด ให้พิจารณา
  - ดึงข้อมูลที่ layout ชั้นบนสุด แล้วส่งลง children
  - หรือใช้ shared server function + cache (เช่น `cache()` / `fetch` + `revalidate`)

## 5. การเรียก API & Security

- แยก namespace API ชัดเจน (ข้อเสนอ)
  - `/api/backoffice/branches` (GET/POST/PUT)
  - `/api/backoffice/services`
  - `/api/backoffice/staff`
  - `/api/backoffice/schedule`
  - `/api/backoffice/bookings`
  - `/api/backoffice/settings`

แนวทางสำคัญ:
- ทุก endpoint backoffice ต้องตรวจ auth และ role ก่อนทำงาน
- ไม่ใช้ endpoint front-office ซ้ำสำหรับงานหลังบ้าน (ลดความเสี่ยงเรื่องสิทธิ์)
- response structure ต้องสอดคล้องกับสเปกใน `backoffice-api.md`

## 6. Error Handling & UX ระดับระบบ

- ใช้ error boundary / `error.tsx` เฉพาะ namespace `/backoffice`
  - แสดงข้อความ error ที่เข้าใจง่ายสำหรับพนักงาน (ไม่โชว์ stack trace)
  - log error รายละเอียดฝั่ง server (เช่นผ่าน logging library)
- ใช้ `loading.tsx` ใต้ `/backoffice` สำหรับ skeleton state
- ในแต่ละเพจ:
  - แสดง toast/alert เมื่อบันทึกสำเร็จ/ล้มเหลว
  - ป้องกันการ submit ซ้ำ (disable ปุ่มระหว่างโหลด)

## 7. Performance & Scaling

- Pagination/Infinite scroll สำหรับตารางที่มีจำนวนมาก เช่น Booking/Staff
- Filter ควรทำที่ฝั่ง server เป็นหลัก (query Prisma พร้อมเงื่อนไข) ไม่ใช่โหลดทั้งหมดแล้ว filter ฝั่ง client
- พิจารณาใช้ index ใน schema Prisma เพิ่มเติมในอนาคตสำหรับ field ที่ค้นหาบ่อย (เช่น `date`, `branchId`, `status` ใน `Booking`)

## 8. สิ่งที่เปิดไว้สำหรับการออกแบบถัดไป

- รูปแบบการ auth/backoffice login
- การออกแบบ design system/component library สำหรับ backoffice (table, form, filter bar, dialog)
- ระบบ audit log (ใครแก้อะไร เมื่อไหร่)

หากฝั่ง Product/ทีมต้องการรายละเอียดระดับ component tree หรือ sequence diagram เพิ่ม สามารถต่อยอดจากเอกสารนี้ในหัวข้อย่อย เช่น `backoffice-design-sequence-booking.md` ได้ในอนาคต
