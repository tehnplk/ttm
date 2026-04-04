/**
 * Script to check if นางณกมล ธรรมสอน has a booking on 2025-01-06 at 15:00-17:00
 * 
 * Usage: npx tsx scripts/check-booking.ts
 */

import prisma from '../src/lib/prisma';

async function checkBooking() {
  try {
    console.log('🔍 กำลังค้นหาพนักงาน: นางณกมล ธรรมสอน...');
    
    // Find employee
    const employee = await prisma.$queryRaw<Array<{
      id: number;
      prename: string | null;
      fname: string | null;
      lname: string | null;
    }>>`
      SELECT id, prename, fname, lname
      FROM employee
      WHERE fname LIKE '%ณกมล%'
        AND lname LIKE '%ธรรมสอน%'
        AND is_active = 'yes'
      LIMIT 1
    `;

    if (!employee || employee.length === 0) {
      console.log('❌ ไม่พบพนักงานชื่อ นางณกมล ธรรมสอน');
      return;
    }

    const emp = employee[0];
    const empName = `${emp.prename || ''}${emp.fname || ''} ${emp.lname || ''}`.trim();
    console.log(`✅ พบพนักงาน: ${empName} (ID: ${emp.id})`);

    // Check bookings on 2025-01-06
    const checkDate = '2025-01-06';
    console.log(`\n🔍 กำลังตรวจสอบการจองวันที่ ${checkDate} เวลา 15:00-17:00...`);

    const bookings = await prisma.$queryRaw<Array<{
      id: number;
      booking_id: string | null;
      book_date: Date;
      book_time: string | null;
      booker_name: string;
      booker_tel: string;
      status: string | null;
      confirm_datetime: Date | null;
      employee_name: string | null;
      branch_name: string | null;
      service_name: string | null;
    }>>`
      SELECT 
        b.id,
        COALESCE(b.booking_id, CONCAT('BK-', LPAD(b.id, 6, '0'))) as booking_id,
        b.book_date,
        b.book_time,
        b.booker_name,
        b.booker_tel,
        b.status,
        b.confirm_datetime,
        CONCAT(COALESCE(e.prename, ''), COALESCE(e.fname, ''), ' ', COALESCE(e.lname, '')) as employee_name,
        br.name as branch_name,
        s.name as service_name
      FROM booking b
      LEFT JOIN employee e ON b.emp_id = e.id
      LEFT JOIN Branch br ON b.branch_id = br.id
      LEFT JOIN Service s ON b.service_id = s.id
      WHERE b.emp_id = ${emp.id}
        AND DATE(b.book_date) = DATE(${checkDate})
        AND (
          b.book_time = '15:00 - 17:00'
          OR b.book_time = 't-3-15:00-17:00'
          OR b.book_time LIKE '15:00%'
          OR b.book_time LIKE '%15:00%'
          OR b.book_time LIKE '%15:00 - 17:00%'
        )
        AND (b.status IS NULL OR b.status = 'pending' OR b.status = 'confirmed' OR b.status = 'completed')
    `;

    if (bookings && bookings.length > 0) {
      console.log(`\n✅ พบการจอง ${bookings.length} รายการ:\n`);
      bookings.forEach((booking, index) => {
        console.log(`📅 การจอง #${index + 1}:`);
        console.log(`   Booking ID: ${booking.booking_id}`);
        console.log(`   วันที่: ${booking.book_date}`);
        console.log(`   เวลา: ${booking.book_time}`);
        console.log(`   ลูกค้า: ${booking.booker_name}`);
        console.log(`   เบอร์โทร: ${booking.booker_tel}`);
        console.log(`   สถานะ: ${booking.status || 'pending'}`);
        console.log(`   สาขา: ${booking.branch_name || 'ไม่ระบุ'}`);
        console.log(`   บริการ: ${booking.service_name || 'ไม่ระบุ'}`);
        if (booking.confirm_datetime) {
          console.log(`   ยืนยันมาแล้วเมื่อ: ${booking.confirm_datetime}`);
        }
        console.log('');
      });
    } else {
      console.log(`\n❌ ไม่พบการจองในวันที่ ${checkDate} เวลา 15:00-17:00`);
      
      // Show all bookings for this staff on this date
      const allBookings = await prisma.$queryRaw<Array<{
        id: number;
        book_time: string | null;
        booker_name: string;
        status: string | null;
      }>>`
        SELECT id, book_time, booker_name, status
        FROM booking
        WHERE emp_id = ${emp.id}
          AND DATE(book_date) = DATE(${checkDate})
        ORDER BY book_time
      `;

      if (allBookings && allBookings.length > 0) {
        console.log(`\n📋 แต่พบการจองอื่นๆ ในวันเดียวกัน:`);
        allBookings.forEach((b) => {
          console.log(`   - เวลา ${b.book_time}: ${b.booker_name} (${b.status || 'pending'})`);
        });
      } else {
        console.log(`\n📋 ไม่มีการจองใดๆ ในวันที่ ${checkDate}`);
      }
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBooking();







