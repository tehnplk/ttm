# สร้าง Branch Table ในฐานข้อมูล

## วิธีที่ 1: ใช้ MySQL Command Line (แนะนำ)

```bash
mysql -u root -p ttm < prisma/add_branch_table.sql
```

หรือถ้าไม่มี password:
```bash
mysql -u root ttm < prisma/add_branch_table.sql
```

## วิธีที่ 2: ใช้ Node.js Script

```bash
node prisma/create-branch-table.js
```

**หมายเหตุ**: ต้องมี `mysql2` package ติดตั้ง:
```bash
npm install mysql2
```

## วิธีที่ 3: รัน SQL โดยตรงใน MySQL Client

1. เปิด MySQL client:
   ```bash
   mysql -u root -p ttm
   ```

2. Copy และ paste SQL จาก `prisma/add_branch_table.sql`

## โครงสร้าง Branch Table

Branch table จะมี fields ต่อไปนี้:

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `code` (varchar(255), UNIQUE) - รหัสสาขา เช่น "001"
- `name` (varchar(255)) - ชื่อสาขา
- `location` (varchar(500)) - ที่อยู่สาขา
- `latitude` (double, nullable) - ละติจูด
- `longitude` (double, nullable) - ลองจิจูด
- `image` (varchar(500)) - รูปภาพสาขา
- `availableServices` (text) - JSON string ของ service IDs
- `createdAt` (datetime) - วันที่สร้าง
- `updatedAt` (datetime) - วันที่อัปเดตล่าสุด

## หลังจากสร้าง Table

1. Prisma Client จะถูก generate อัตโนมัติ (ถ้า schema.prisma มี Branch model)
2. API routes จะสามารถใช้งาน Branch model ได้ทันที
3. สามารถเพิ่ม/แก้ไข/ลบสาขาได้ผ่าน admin interface

## ตรวจสอบว่า Table ถูกสร้างแล้ว

```sql
SHOW TABLES LIKE 'Branch';
DESCRIBE Branch;
```

