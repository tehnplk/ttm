# Backoffice Permissions

## Roles (เสนอ)
1. Admin
   - ระดับระบบทั้งหมด
2. BranchManager / Supervisor
   - ดูแลสาขาหนึ่งหรือหลายสาขา
3. Staff / Reception
   - พนักงานหน้าร้าน ใช้จัดการคิวแต่ไม่แก้ไข config ใหญ่
4. Viewer (optional)
   - อ่านอย่างเดียวเพื่อการ monitor

## Permission Matrix (ระดับสูง)

- Branch Management
  - Admin: CRUD ทุกสาขา
  - BranchManager: แก้ไขเฉพาะสาขาที่รับผิดชอบ
  - Staff/Viewer: read-only

- Service Management
  - Admin: CRUD ทุกบริการ
  - BranchManager: เสนอ/เปิดปิดบางบริการ (ตาม policy)
  - Staff/Viewer: read-only

- Staff Management
  - Admin: CRUD staff ทุกสาขา
  - BranchManager: จัดการ staff ในสาขาตัวเอง
  - Staff/Viewer: read-only

- Staff Schedule
  - Admin: แก้ไข schedule ทุกคน
  - BranchManager: แก้ไขเฉพาะ staff ในสาขาที่รับผิดชอบ
  - Staff: ดูตารางของตนเอง

- Booking Management
  - Admin: ดู+แก้ไขทุก booking
  - BranchManager/Staff: ดู+เปลี่ยนสถานะ booking ในสาขาที่รับผิดชอบ
  - Viewer: read-only

- Shop Configuration
  - Admin: แก้ไขได้ทั้งหมด
  - อื่น ๆ: read-only หรือห้ามเข้าหน้า (แล้วแต่ policy)

- Reports
  - Admin: เข้าถึงรายงานทั้งหมด
  - BranchManager: รายงานจำกัดเฉพาะสาขา
  - Staff/Viewer: รายงานที่อนุญาต
