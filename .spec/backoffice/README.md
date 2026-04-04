# Backoffice Specification – SSOT

โฟลเดอร์ `.spec` คือ Single Source of Truth (SSOT) สำหรับแผน/สเปกของระบบหลังบ้าน (Backoffice) ของโครงการ "คลินิกแผนไทย วสส.พล" เท่านั้น

## โครงสร้างไฟล์
- `backoffice-overview.md` — ภาพรวม business goal, scope, non-goal ของระบบหลังบ้าน
- `backoffice-domain.md` — โมเดลโดเมนฝั่งหลังบ้าน อ้างอิงจาก `prisma/schema.prisma` และบริบทการใช้งานจริง
- `backoffice-modules.md` — รายการ module/หน้าจอหลักของระบบหลังบ้าน
- `backoffice-usecases.md` — Use case เชิงละเอียดต่อ module/actor
- `backoffice-permissions.md` — Role & Permission matrix ของระบบหลังบ้าน
- `backoffice-api.md` — มุมมอง API/contract ระหว่าง Backoffice UI กับ backend
- `backoffice-design.md` — ภาพรวมสถาปัตยกรรมและโครงสร้างเทคนิคของ backoffice (routing, data flow, state, pattern)

## ขอบเขตของ SSOT นี้
- ครอบคลุมเฉพาะฟังก์ชันการทำงานของผู้ดูแลระบบ/พนักงานหน้าร้าน (backoffice)
- ไม่ลงลึกถึง UX/UI pixel-perfect, แต่กำหนด behavior และข้อมูลที่จำเป็นในแต่ละฟีเจอร์ให้ชัดเจน
- ไม่แตะ baseline golden data หรือ behavior ปัจจุบันของหน้า customer booking (front-office)

การเปลี่ยนแปลง requirement ที่เกี่ยวกับระบบหลังบ้านให้สะท้อนในไฟล์เหล่านี้ก่อนเสมอ จากนั้นจึงค่อยแตกเป็น task ทางเทคนิคสำหรับการพัฒนา/ทดสอบ
