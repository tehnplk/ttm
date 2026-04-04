import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";
import { auth } from "@/authConfig";

// List bookings
export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    // Use raw query to handle enum types properly
    // Now using dedicated fields: branch_id, service_id, price
    const bookings = await prisma.$queryRaw<Array<{
      id: number;
      emp_id: number;
      branch_id: number | null;
      service_id: number | null;
      price: number | null;
      book_date: string;
      book_time: string | null;
      booker_name: string;
      booker_tel: string;
      note1: string | null;
      note4: string;
      note5: string | null;
      line_id: string | null;
      booking_id: string | null;
      status: string | null;
      confirm_datetime: Date | null;
      employee_name: string | null;
      branch_name: string | null;
      service_name: string | null;
    }>>`
      SELECT 
        b.id,
        b.emp_id,
        b.branch_id,
        b.service_id,
        b.price,
        DATE_FORMAT(b.book_date, '%Y-%m-%d') as book_date,
        b.book_time,
        b.booker_name,
        b.booker_tel,
        b.note1,
        b.note4,
        b.note5,
        b.line_id,
        COALESCE(b.booking_id, CONCAT('BK-', LPAD(b.id, 6, '0'))) as booking_id,
        b.status,
        b.confirm_datetime,
        CONCAT(COALESCE(e.prename, ''), COALESCE(e.fname, ''), ' ', COALESCE(e.lname, '')) as employee_name,
        br.name as branch_name,
        s.name as service_name
      FROM booking b
      LEFT JOIN employee e ON b.emp_id = e.id
      LEFT JOIN Branch br ON b.branch_id = br.id
      LEFT JOIN Service s ON b.service_id = s.id
      ORDER BY b.book_date DESC, b.id DESC
      LIMIT 5000
    `;

    const formattedBookings = bookings.map((b) => {
      // book_date is already formatted as YYYY-MM-DD string from MySQL DATE_FORMAT
      const dateStr = String(b.book_date).trim();
      
      return {
        id: String(b.id),
        bookingId: b.booking_id || `BK-${String(b.id).padStart(6, '0')}`,
        branchId: b.branch_id ? String(b.branch_id) : "",
        branchName: b.branch_name || "ไม่ระบุ",
        serviceId: b.service_id ? String(b.service_id) : "",
        serviceName: b.service_name || "ไม่ระบุ",
        price: b.price ? Number(b.price) : null,
        staffId: String(b.emp_id),
        staffName: b.employee_name?.trim() || "ไม่ระบุ",
        date: dateStr,
        time: b.book_time || "ไม่ระบุ",
        customerName: b.booker_name,
        customerPhone: b.booker_tel,
        note: b.note4 || "",
        note1: b.note1 || null,
        note5: b.note5 || null,
        status: b.status || "pending",
        confirmDatetime: b.confirm_datetime ? (b.confirm_datetime instanceof Date ? b.confirm_datetime.toISOString() : String(b.confirm_datetime)) : null,
        lineId: b.line_id || null,
        createdAt: "",
        updatedAt: "",
      };
    });
    
    // Count bookings by date for debugging
    const bookingsByDate = formattedBookings.reduce((acc, b) => {
      const date = b.date;
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`[Admin Bookings API] Total bookings returned: ${formattedBookings.length} (LIMIT 1000)`);
    console.log(`[Admin Bookings API] Bookings by date (sample):`, Object.entries(bookingsByDate).slice(0, 10));
    if (bookingsByDate['2026-01-10']) {
      console.log(`[Admin Bookings API] Bookings on 2026-01-10: ${bookingsByDate['2026-01-10']} (Expected: 121)`);
      const bookingsOnDate = formattedBookings.filter(b => b.date === '2026-01-10');
      if (bookingsOnDate.length !== 121) {
        console.warn(`[Admin Bookings API] WARNING: Expected 121 bookings on 2026-01-10 but got ${bookingsOnDate.length}. This might be due to LIMIT 1000 in the query.`);
      }
      console.log(`[Admin Bookings API] ALL bookings on 2026-01-10 (${bookingsOnDate.length} total):`, bookingsOnDate.map(b => ({
        id: b.id,
        date: b.date,
        branchId: b.branchId,
        branchName: b.branchName,
        staffId: b.staffId,
        staffName: b.staffName,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        time: b.time,
        status: b.status
      })));
      
      // Group by branch
      const byBranch = bookingsOnDate.reduce((acc, b) => {
        const branchId = b.branchId || 'null';
        if (!acc[branchId]) acc[branchId] = [];
        acc[branchId].push(b);
        return acc;
      }, {} as Record<string, typeof bookingsOnDate>);
      console.log(`[Admin Bookings API] Bookings on 2026-01-10 by branch:`, Object.entries(byBranch).map(([branchId, bookings]) => ({
        branchId,
        count: bookings.length,
        branchName: bookings[0]?.branchName
      })));
    } else {
      console.warn(`[Admin Bookings API] No bookings found for 2026-01-10. This might be due to LIMIT 1000 in the query.`);
    }
    
    return NextResponse.json({
      bookings: formattedBookings,
    });
  } catch (error) {
    console.error("Admin bookings GET error", error);
    return NextResponse.json(
      { error: "Failed to load bookings", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

// Create booking
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  
  // Get authenticated user info
  const session = await auth();
  let adminUsername = "admin";
  if (session?.user) {
    // Try to get name from profile or user object
    const userProfile = (session.user as any)?.profile;
    if (userProfile) {
      try {
        const profile = typeof userProfile === 'string' ? JSON.parse(userProfile) : userProfile;
        adminUsername = profile.name || profile.name_th || profile.name_eng || profile.provider_id || session.user.name || "admin";
      } catch {
        adminUsername = session.user.name || "admin";
      }
    } else {
      adminUsername = session.user.name || "admin";
    }
  }
  
  try {
    const body = await request.json();
    const empId = typeof body.empId === "number" ? body.empId : typeof body.empId === "string" ? parseInt(body.empId) : null;
    const branchId = typeof body.branchId === "number" ? body.branchId : typeof body.branchId === "string" ? parseInt(body.branchId) : null;
    const serviceId = typeof body.serviceId === "number" ? body.serviceId : typeof body.serviceId === "string" ? parseInt(body.serviceId) : null;
    const bookDate = typeof body.bookDate === "string" ? body.bookDate.trim() : "";
    const bookTime = typeof body.bookTime === "string" ? body.bookTime.trim() : "";
    const bookerName = typeof body.bookerName === "string" ? body.bookerName.trim() : "";
    const bookerTel = typeof body.bookerTel === "string" ? body.bookerTel.trim() : "";
    // Save booking source and admin username in note1
    const note1 = `admin:${adminUsername}`;
    const note2 = typeof body.note2 === "string" ? body.note2.trim() : null;
    const note3 = typeof body.note3 === "string" ? body.note3.trim() : null;
    const cid = typeof body.cid === "string" ? body.cid.trim() : null;
    const lineId = typeof body.lineId === "string" ? body.lineId.trim() : null;
    const status = typeof body.status === "string" ? body.status.trim() : "pending";

    if (!empId || !bookDate || !bookTime || !bookerName || !bookerTel) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน (empId, bookDate, bookTime, bookerName, bookerTel)" },
        { status: 400 },
      );
    }

    // Check if the slot is already booked
    try {
      // Parse time slot to extract start time and end time
      let timeStr = bookTime.trim();
      let startTime = '';
      let endTime = '';
      
      // If time is in format "t-0-08:30-09:30" or "t-3-15:00-17:00"
      if (timeStr.startsWith('t-')) {
        const timeMatch = timeStr.match(/(\d{2}:\d{2})[\s-]+(\d{2}:\d{2})/);
        if (timeMatch) {
          startTime = timeMatch[1];
          endTime = timeMatch[2];
        } else {
          // Fallback: split by '-' and take last two parts
          const parts = timeStr.split('-');
          if (parts.length >= 4 && /^\d{2}:\d{2}$/.test(parts[parts.length - 2]) && /^\d{2}:\d{2}$/.test(parts[parts.length - 1])) {
            startTime = parts[parts.length - 2];
            endTime = parts[parts.length - 1];
          }
        }
      } else if (timeStr.includes(' - ')) {
        // Format: "15:00 - 17:00"
        const parts = timeStr.split(' - ');
        startTime = parts[0].trim();
        endTime = parts[1].trim();
      } else if (timeStr.includes('-') && !timeStr.startsWith('t-')) {
        // Format: "15:00-17:00" (no space)
        const parts = timeStr.split('-');
        startTime = parts[0].trim();
        endTime = parts[1].trim();
      } else {
        // Just start time: "15:00"
        startTime = timeStr;
      }

      console.log(`[Admin Booking] Checking for conflicts: empId=${empId}, date=${bookDate}, time=${bookTime}, startTime=${startTime}, endTime=${endTime}`);

      // Check for existing bookings with the same employee, date, and same start time
      // This includes regular bookings AND "off" bookings (booker_name = "off")
      // Both types of bookings will block new bookings from being created
      // IMPORTANT: Only match if the start time is EXACTLY the same
      const existingBookings = await prisma.$queryRaw<Array<{
        id: number;
        booker_name: string;
        book_time: string;
      }>>`
        SELECT id, booker_name, book_time
        FROM booking
        WHERE emp_id = ${empId}
          AND DATE(book_date) = DATE(${bookDate})
          AND (
            -- Exact match for full time range (with space)
            book_time = ${bookTime}
            OR book_time = ${`${startTime} - ${endTime}`}
            -- Exact match for full time range (without space)
            OR book_time = ${`${startTime}-${endTime}`}
            -- Match time slot ID format: "t-X-15:00-17:00" (exact end time match)
            OR (${endTime} != '' AND book_time LIKE ${`t-%-${startTime}-${endTime}`})
            -- Match if booking time starts with the same start time exactly
            OR (${startTime} != '' AND (
              -- Exact match: just the start time "15:00"
              book_time = ${startTime}
              -- Starts with start time followed by space and dash: "15:00 - ..."
              OR book_time LIKE ${`${startTime} - %`}
              -- Starts with start time followed by dash (no space): "15:00-..."
              OR book_time LIKE ${`${startTime}-%`}
              -- Time slot ID format: "t-X-15:00-..."
              OR book_time LIKE ${`t-%-${startTime}-%`}
            ))
          )
          AND (status IS NULL OR status = 'pending' OR status = 'confirmed')
      `;

      console.log(`[Admin Booking] Found ${existingBookings.length} existing bookings (including "off" bookings):`, existingBookings);

      if (existingBookings && existingBookings.length > 0) {
        const existingBooking = existingBookings[0];
        const isOff = existingBooking.booker_name === 'off' || existingBooking.booker_name === 'Off' || existingBooking.booker_name === 'OFF';
        return NextResponse.json(
          { 
            error: isOff 
              ? "ช่วงเวลานี้พนักงานหยุด กรุณาเลือก slot อื่น"
              : "ช่วงเวลานี้มีคนจองแล้ว กรุณาเลือก slot อื่น",
            details: isOff
              ? `พนักงานคนนี้หยุดในวันที่ ${bookDate} เวลา ${existingBooking.book_time}`
              : `พนักงานคนนี้มีจองในวันที่ ${bookDate} เวลา ${existingBooking.book_time} โดย ${existingBooking.booker_name}`
          },
          { status: 409 }, // Conflict status
        );
      }
    } catch (checkError: any) {
      console.error('Error checking existing bookings:', checkError);
      // Continue with booking creation if check fails (should not block)
    }

    // Generate sequential booking ID
    let nextBookingNumber = 1;
    try {
      const result = await prisma.$queryRaw<Array<{ bookingId: string | null }>>`
        SELECT booking_id as bookingId
        FROM booking
        WHERE booking_id IS NOT NULL
          AND booking_id LIKE 'BK-%'
        ORDER BY CAST(SUBSTRING(booking_id, 4) AS UNSIGNED) DESC
        LIMIT 1
      `;
      
      if (result && result.length > 0 && result[0].bookingId) {
        const match = result[0].bookingId.match(/BK-(\d+)/);
        if (match) {
          nextBookingNumber = parseInt(match[1], 10) + 1;
        }
      }
    } catch (error) {
      console.error('Error finding max booking ID, starting from 1:', error);
      nextBookingNumber = 1;
    }

    const bookingId = `BK-${String(nextBookingNumber).padStart(6, '0')}`;
    
    // Save current date and time in note5 when booking is created
    // Format: YYYY-MM-DD HH:mm:ss
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const bookingCreatedAt = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    // Parse date string - keep as string for raw SQL to preserve exact date
    // This avoids timezone issues where Prisma converts Date to UTC before saving
    let bookDateStr: string;
    const dateMatch = bookDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      // Use the date string directly (YYYY-MM-DD format)
      bookDateStr = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    } else {
      // Fallback: extract date part from ISO string
      const dateOnly = bookDate.split('T')[0];
      const parsedMatch = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (parsedMatch) {
        bookDateStr = `${parsedMatch[1]}-${parsedMatch[2]}-${parsedMatch[3]}`;
      } else {
        // Last resort: use original string
        bookDateStr = bookDate;
      }
    }
    
    console.log(`[Admin Booking] Date received: "${bookDate}", parsed to: "${bookDateStr}"`);

    // Try to create with raw SQL to preserve exact date
    let createdId = 0;
    let createdBookingId = bookingId;
    try {
      // Insert using raw SQL to control date format exactly
      await prisma.$executeRaw`
        INSERT INTO booking (
          emp_id, branch_id, service_id, book_date, book_time,
          booker_name, booker_tel, note1, note2, note3, note4, note5,
          booking_id, cid, line_id, status
        ) VALUES (
          ${empId},
          ${branchId && !isNaN(branchId) ? branchId : null},
          ${serviceId && !isNaN(serviceId) ? serviceId : null},
          ${bookDateStr},
          ${bookTime},
          ${bookerName},
          ${bookerTel},
          ${note1},
          ${note2},
          ${note3},
          ${""},
          ${bookingCreatedAt},
          ${bookingId},
          ${cid},
          ${lineId},
          ${status || "pending"}
        )
      `;
      
      // Get the last inserted ID
      const lastInsertResult = await prisma.$queryRaw<Array<{ id: bigint }>>`
        SELECT LAST_INSERT_ID() as id
      `;
      // Convert BigInt to Number (safe for booking IDs)
      createdId = Number(lastInsertResult[0]?.id || 0);
      
      console.log(`[Admin Booking] Created booking ID: ${createdId}, date saved: ${bookDateStr}`);
    } catch (error: any) {
      console.error('Error creating booking with raw SQL:', error);
      // If raw SQL fails, fallback to Prisma ORM with noon time to avoid timezone shift
      const bookDateForPrisma = new Date(bookDateStr + 'T12:00:00');
      
      try {
        const created = await prisma.booking.create({
          data: {
            empId,
            branchId: branchId && !isNaN(branchId) ? branchId : null,
            serviceId: serviceId && !isNaN(serviceId) ? serviceId : null,
            bookDate: bookDateForPrisma,
            bookTime,
            bookerName,
            bookerTel,
            note1,
            note2,
            note3,
            note4: "",
            note5: bookingCreatedAt,
            bookingId: bookingId,
            cid,
            lineId,
            status: status || "pending",
          },
        });
        createdId = created.id;
      } catch (createError: any) {
        // If bookingId column doesn't exist, create without it
        if (createError?.code === 'P2003' || createError?.message?.includes('booking_id')) {
          console.warn('bookingId column not found, creating without it');
          const created = await prisma.booking.create({
            data: {
              empId,
              branchId: branchId && !isNaN(branchId) ? branchId : null,
              serviceId: serviceId && !isNaN(serviceId) ? serviceId : null,
              bookDate: bookDateForPrisma,
              bookTime,
              bookerName,
              bookerTel,
              note1,
              note2,
              note3,
              note4: "",
              note5: bookingCreatedAt,
              cid,
              lineId,
              status: status || "pending",
            },
          });
          createdId = created.id;
        } else {
          throw createError;
        }
      }
    }

    // Fetch created booking with employee info
    const created = await prisma.booking.findUnique({
      where: { id: createdId },
      include: { employee: true },
    });

    if (!created) {
      return NextResponse.json({ error: "Failed to fetch created booking" }, { status: 500 });
    }

    return NextResponse.json(
      {
        id: created.id,
        bookingId: createdBookingId,
        empId: created.empId,
        employeeName: created.employee ? `${created.employee.prename}${created.employee.fname} ${created.employee.lname}` : "ไม่ระบุ",
        bookDate: bookDateStr, // Return the exact date string we saved
        bookTime: created.bookTime,
        bookerName: created.bookerName,
        bookerTel: created.bookerTel,
        note1: created.note1,
        note2: created.note2,
        note3: created.note3,
        note4: created.note4,
        note5: created.note5,
        cid: created.cid,
        lineId: created.lineId,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Admin bookings POST error", error);
    return NextResponse.json(
      { 
        error: "Failed to create booking",
        details: error?.message || String(error)
      },
      { status: 500 },
    );
  }
}
