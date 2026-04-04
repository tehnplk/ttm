# Migration Guide: Import ttm.sql Database

## Overview
This guide will help you migrate your database structure to match the `ttm.sql` file and import all data.

## Prerequisites
- MySQL/MariaDB installed and running
- Database credentials (host, user, password, database name)
- Access to `prisma/db/ttm.sql` file

## Method 1: Direct Import (Recommended)

The easiest way is to import the SQL file directly:

```bash
# Option 1: Using the import script
./prisma/import-ttm-data.sh

# Option 2: Manual import
mysql -u root -p ttm < prisma/db/ttm.sql
```

## Method 2: Step-by-step Migration

If you need to create tables first, then import data:

### Step 1: Create Database Structure
```bash
mysql -u root -p ttm < prisma/migrate-to-ttm.sql
```

### Step 2: Import Data
```bash
mysql -u root -p ttm < prisma/db/ttm.sql
```

## Database Structure

The migration will create the following tables:

1. **booking** - จองบริการ
   - `id` (int, AUTO_INCREMENT)
   - `emp_id` (int) - รหัสพนักงาน
   - `book_date` (date) - วันที่จอง
   - `book_time` (varchar) - เวลาจอง
   - `booker_name` (varchar) - ชื่อผู้จอง
   - `booker_tel` (varchar) - เบอร์โทรผู้จอง
   - `note1` - `note5` (varchar) - หมายเหตุต่างๆ
   - `cid` (varchar) - เลขบัตรประชาชน
   - `line_id` (varchar) - LINE ID

2. **employee** - พนักงาน
   - `id` (int, AUTO_INCREMENT)
   - `prename` (varchar) - คำนำหน้า
   - `fname` (varchar) - ชื่อ
   - `lname` (varchar) - นามสกุล
   - `sex` (enum) - เพศ
   - `birth` (date) - วันเกิด
   - `position` (int) - ตำแหน่ง
   - `tel` (varchar) - เบอร์โทร
   - `is_active` (enum) - สถานะการใช้งาน

3. **cwork_time** - เวลาทำงาน
4. **cclose** - วันปิด
5. **choliday** - วันหยุด
6. **cposition** - ตำแหน่ง
7. **cstop** - หยุดงาน
8. **emp_stop_date** - วันที่พนักงานหยุด
9. **line_log** - Log ของ LINE
10. **view_log** - Log การเข้าชม

## Important Notes

⚠️ **Warning**: This migration will:
- Drop existing tables if they exist
- Replace all data with data from `ttm.sql`
- Use integer IDs instead of UUIDs (different from current Prisma schema)

## After Migration

After importing the data, you may need to:

1. Update Prisma schema to match the new structure
2. Update API routes to work with integer IDs
3. Update frontend components if needed

## Troubleshooting

### Error: "Table already exists"
- Drop the database and recreate it, or
- Use `DROP TABLE IF EXISTS` statements

### Error: "Foreign key constraint fails"
- Make sure to import tables in the correct order
- Check that referenced tables exist before importing

### Error: "Character set mismatch"
- Ensure database uses `utf8mb4` character set
- Check MySQL configuration

## Next Steps

After successful migration:
1. Verify data import: `SELECT COUNT(*) FROM booking;`
2. Check employee data: `SELECT * FROM employee LIMIT 10;`
3. Update Prisma schema if needed
4. Test API endpoints

