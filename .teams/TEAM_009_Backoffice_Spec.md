# TEAM_009 – Backoffice Spec

## Context
- Goal: ออกแบบและสร้างสเปกระบบหลังบ้าน (Backoffice) สำหรับระบบจองคิวคลินิกแผนไทย วสส.พล
- Date: 2025-11-30
- Stack: Next.js 16 (App Router), React 19, Prisma 5, Tailwind 4

## Baseline
- `npm run lint` ปัจจุบัน **ล้มเหลว** จากโค้ดที่มีอยู่ก่อน (hook + any-types) – งานรอบนี้จะเพิ่มเอกสาร `.spec` เท่านั้น ไม่แตะ logic รันไทม์

## Plan
1) เก็บ requirement ระบบหลังบ้านจาก schema/domain ที่มีอยู่
2) ออกแบบโครงสร้างไฟล์สเปกภายใต้ `.spec`
3) เขียนสเปกหลักระบบหลังบ้าน (module, use case, domain, API คร่าว ๆ, สิทธิ์การใช้งาน)
4) เปิดรายการคำถาม/ข้อสมมติฐานที่ต้องยืนยันกับ Product Owner

## Progress Log
- [x] อ่านโครงสร้างโปรเจกต์, team logs เดิม, และ metadata
- [x] รัน `npm run lint` เพื่อดู baseline (status: FAIL, มี error เดิมใน component/context)
- [x] ลงทะเบียนทีมเป็น TEAM_009 และสร้าง team log
- [ ] เก็บ requirement รายละเอียดระบบหลังบ้านจากโค้ด/schema
- [ ] เขียนสเปกระบบหลังบ้านใน `.spec`
