# Backoffice Tasks

เอกสารนี้รวบรวม tasks ที่เกี่ยวข้องกับระบบหลังบ้าน (Backoffice) ของโครงการนี้ โดยอ้างอิงจากสเปกใน `.spec/backoffice` และโค้ดที่ implement แล้ว

สถานะ:
- `done` = ทำเสร็จแล้ว (มีโค้ด/สเปกอยู่ใน repo ตอนนี้)
- `todo` = ยังไม่ได้ทำ หรือยังทำไม่ครบ

---

## 1. Spec & Documentation

| ID | Task | Scope | Status | Notes |
| --- | --- | --- | --- | --- |
| SPEC-OVERVIEW | เขียนภาพรวมและ scope ของ backoffice | สเปก | done | `backoffice-overview.md` |
| SPEC-DOMAIN | อธิบายโดเมน Branch/Service/Staff/Booking/ShopConfig สำหรับฝั่งหลังบ้าน | สเปก | done | `backoffice-domain.md` |
| SPEC-MODULES | กำหนด modules/หน้าจอหลักของ backoffice | สเปก | done | `backoffice-modules.md` |
| SPEC-USECASES | เขียน use cases หลัก (UC-BO-01..07) | สเปก | done | `backoffice-usecases.md` |
| SPEC-PERMISSIONS | นิยาม roles และ permission matrix | สเปก | done | `backoffice-permissions.md` |
| SPEC-API | กำหนด API contract ระดับสูงของ backoffice | สเปก | done | `backoffice-api.md` |
| SPEC-DESIGN | เขียน design/architecture ของ backoffice (routing, layout, data flow) | สเปก | done | `backoffice-design.md` |
| SPEC-AUTH | สเปกด้าน Auth/Session/Role mapping สำหรับ backoffice | สเปก | todo | ยังไม่เขียน (เสนอให้แยกไฟล์ `backoffice-auth.md`) |
| SPEC-AUDIT | สเปกระบบ audit log (ใครแก้อะไร เมื่อไหร่) | สเปก | todo | ยังไม่เขียน (เสนอไฟล์ `backoffice-audit-log.md`) |
| SPEC-REPORTS-DETAIL | สเปกรายงานเชิงลึก (metric/field/รูปแบบ) | สเปก | todo | ต่อจาก `backoffice-reports` section ในอนาคต |
| SPEC-TESTING | กลยุทธ์ Testing สำหรับ backoffice (unit/integration/e2e/golden) | สเปก | todo | ยังไม่เขียน (เสนอไฟล์ `backoffice-testing.md`) |
| SPEC-DATA-PRIVACY | นโยบายอายุข้อมูลและ privacy ของข้อมูลลูกค้า | สเปก | todo | ยังไม่เขียน (เสนอไฟล์ `backoffice-data-privacy.md`) |

---

## 2. UI Routing & Layout

| ID | Task | Scope | Status | Notes |
| --- | --- | --- | --- | --- |
| UI-ROUTE-STRUCTURE | สร้าง namespace `/backoffice` ใน App Router | โค้ด | done | `src/app/backoffice/layout.tsx`, `src/app/backoffice/page.tsx` |
| UI-LAYOUT | สร้าง layout หลัก (sidebar + header) สำหรับ backoffice | โค้ด | done | `src/app/backoffice/layout.tsx` |
| UI-DASHBOARD | สร้าง Dashboard หน้าแรกแบบ placeholder | โค้ด | done | `src/app/backoffice/page.tsx` |
| UI-BRANCHES-PAGE | สร้างหน้า `/backoffice/branches` แบบ placeholder | โค้ด | done | `src/app/backoffice/branches/page.tsx` |
| UI-SERVICES-PAGE | สร้างหน้า `/backoffice/services` แบบ placeholder | โค้ด | done | `src/app/backoffice/services/page.tsx` |
| UI-STAFF-PAGE | สร้างหน้า `/backoffice/staff` แบบ placeholder | โค้ด | done | `src/app/backoffice/staff/page.tsx` |
| UI-SCHEDULE-PAGE | สร้างหน้า `/backoffice/schedule` แบบ placeholder | โค้ด | done | `src/app/backoffice/schedule/page.tsx` |
| UI-BOOKINGS-PAGE | สร้างหน้า `/backoffice/bookings` แบบ placeholder | โค้ด | done | ถูกอัปเดตให้ดึงข้อมูลจริงแล้ว (ดู section 3) |
| UI-SETTINGS-PAGE | สร้างหน้า `/backoffice/settings` แบบ placeholder | โค้ด | done | `src/app/backoffice/settings/page.tsx` |
| UI-REPORTS-PAGE | สร้างหน้า `/backoffice/reports` แบบ placeholder | โค้ด | done | `src/app/backoffice/reports/page.tsx` |

---

## 3. Bookings Module (Backoffice)

| ID | Task | Scope | Status | Notes |
| --- | --- | --- | --- | --- |
| BK-SERVICE-LAYER | สร้าง service layer สำหรับดึงรายการ Booking | โค้ด | done | `src/lib/backoffice/booking-service.ts` (`listBookings`) |
| BK-API-LIST | สร้าง `GET /api/backoffice/bookings` | โค้ด | done | `src/app/api/backoffice/bookings/route.ts` |
| BK-UI-LIST | แสดงตารางรายการจองใน `/backoffice/bookings` จาก service layer | โค้ด | done | `src/app/backoffice/bookings/page.tsx` |
| BK-STATUS-UPDATE | เพิ่ม action เปลี่ยนสถานะ (confirmed/completed/cancelled) จาก backoffice | โค้ด | todo | ต้องเพิ่ม PATCH API + ปุ่มใน UI |
| BK-FILTERS | เพิ่ม filter (วันที่/สาขา/บริการ/สถานะ) ในตาราง Booking | โค้ด | todo | ต้องออกแบบ query shape + UI filter |
| BK-PAGINATION | รองรับ pagination หรือ infinite scroll | โค้ด | todo | ปรับ service layer + UI |

---

## 4. Branches/Services/Staff/Schedule/Settings/Reports

| ID | Task | Scope | Status | Notes |
| --- | --- | --- | --- | --- |
| BR-CRUD | CRUD สาขาใน `/backoffice/branches` + Prisma service + API | โค้ด | todo | ต่อจาก `SPEC-DOMAIN` & `SPEC-MODULES` |
| SV-CRUD | CRUD บริการใน `/backoffice/services` + service + API | โค้ด | todo | |
| ST-CRUD | CRUD พนักงาน/หมอนวดใน `/backoffice/staff` + service + API | โค้ด | todo | |
| SC-SCHEDULE-UI | UI ปฏิทินตารางงานพนักงานใน `/backoffice/schedule` | โค้ด | todo | ผูกกับ `StaffSchedule` |
| SC-SCHEDULE-API | API สำหรับแก้ไข `offDays` และ `busySlots` | โค้ด | todo | |
| CFG-SHOPCONFIG-UI | UI ตั้งค่าร้านใน `/backoffice/settings` | โค้ด | todo | ผูกกับ `ShopConfig` |
| CFG-SHOPCONFIG-API | API สำหรับอ่าน/เขียน `ShopConfig` | โค้ด | todo | |
| RP-UI | UI รายงานใน `/backoffice/reports` (ตาราง/กราฟ) | โค้ด | todo | |
| RP-DATA | Query/report service สำหรับดึงข้อมูลรายงาน | โค้ด | todo | |

---

## 5. Cross-cutting Concerns (Auth, Permission, Testing)

| ID | Task | Scope | Status | Notes |
| --- | --- | --- | --- | --- |
| AUTH-BACKOFFICE | ผูก routing `/backoffice` กับระบบ Auth/Role จริง | โค้ด | todo | ต้องออกแบบใน `SPEC-AUTH` ก่อน |
| PERM-ENFORCE | บังคับใช้ permission matrix ใน API/Service (Admin/BranchManager/Staff/Viewer) | โค้ด | todo | ใช้ role/branch context ตาม `backoffice-permissions.md` |
| TEST-BACKOFFICE-E2E | สร้าง e2e test สำหรับ flow สำคัญของ backoffice | โค้ด/เทส | todo | ต้องกำหนดชุด flow ใน `SPEC-TESTING` |
| LOGGING-AUDIT | เพิ่ม logging/audit log เมื่อแก้ไขข้อมูลสำคัญ (Booking/Branch/Service/Staff) | โค้ด | todo | ต่อจาก `SPEC-AUDIT` |

---

หากมี task ใหม่สำหรับ backoffice ให้เพิ่มเข้ามาในไฟล์นี้เสมอ และอัปเดตสถานะจาก `todo` → `done` เมื่อ implement เสร็จ เพื่อให้ `.spec/backoffice` เป็น Single Source of Truth ของทั้งสเปกและแผนงาน backoffice
