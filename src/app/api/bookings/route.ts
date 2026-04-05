import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Schema for input validation
const bookingSchema = z.object({
  branchId: z.string().min(1, 'Branch ID is required'),
  serviceId: z.string().min(1, 'Service ID is required'),
  staffId: z.string().min(1, 'Staff ID is required'),
  date: z.string(), // Accept date string (YYYY-MM-DD or ISO datetime)
  time: z.string().min(1, 'Time is required'),
  timeSlotId: z.string().optional(), // Time slot ID (optional)
  customerName: z.string().min(1, 'Customer Name is required'),
  customerPhone: z.string().min(10, 'Phone number must be at least 10 digits'),
  price: z.number().optional(), // Service price
  note: z.string().optional(), // Optional note
  userId: z.string().nullable().optional(), // LINE user ID from URL parameter
});

function getWeekRangeFromDate(dateStr: string): { weekStart: string; weekEnd: string } {
  const baseDate = new Date(`${dateStr}T00:00:00`);
  const dayOfWeek = baseDate.getDay();
  const diffToMonday = (dayOfWeek + 6) % 7;

  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    weekStart: formatDate(monday),
    weekEnd: formatDate(sunday),
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check if booking is enabled - MANDATORY CHECK
    let bookingEnabled = "yes"; // Default to enabled
    let bookingMessage = "ขณะนี้ระบบจองปิดใช้งานชั่วคราว กรุณารอสักครู่";
    
    try {
      // Try with uppercase table name first (Windows/local)
      let settings: Array<{
        booking_enabled: string | null;
        booking_message: string | null;
      }> = [];
      
      const tableNames = ['setting', 'Setting', 'SETTING'];
      let lastError: any = null;
      
      for (const tableName of tableNames) {
        try {
          // Use queryRawUnsafe for better compatibility with case-sensitive MySQL
          settings = await prisma.$queryRawUnsafe<Array<{
            booking_enabled: string | null;
            booking_message: string | null;
          }>>(`
            SELECT 
              booking_enabled,
              booking_message
            FROM \`${tableName}\`
            LIMIT 1
          `);
          
          // If we got here, the query succeeded
          break;
        } catch (tableError: any) {
          lastError = tableError;
          // Continue to next table name
          continue;
        }
      }
      
      // If all attempts failed, log the error
      if (!settings || settings.length === 0) {
        console.error('Failed to fetch booking status from all table name variations in POST:', lastError);
        throw lastError || new Error('Failed to query booking status');
      }

      if (settings && settings.length > 0 && settings[0]) {
        bookingEnabled = settings[0].booking_enabled || "yes";
        bookingMessage = settings[0].booking_message || bookingMessage;
      }
    } catch (statusError: any) {
      // If column doesn't exist, log but still check
      console.error('Error checking booking status:', statusError);
      const errorMsg = statusError?.message || String(statusError);
      // If it's a column error, we might not have the feature yet, but log it
      if (errorMsg.includes('Unknown column') || errorMsg.includes('doesn\'t exist')) {
        console.warn('booking_enabled column or table not found, defaulting to enabled');
        // Default to enabled if column doesn't exist (backward compatibility)
        bookingEnabled = "yes";
      } else {
        // For other errors, be safe and block booking
        console.error('Failed to check booking status, blocking booking for safety:', errorMsg);
        return NextResponse.json(
          { 
            error: 'Booking status check failed',
            message: 'ไม่สามารถตรวจสอบสถานะการจองได้ กรุณาลองใหม่อีกครั้ง' 
          },
          { status: 500 }
        );
      }
    }

    // Enforce booking status - REJECT if disabled
    console.log(`[Booking Check] booking_enabled = "${bookingEnabled}", message = "${bookingMessage}"`);
    if (bookingEnabled !== "yes") {
      console.warn(`[Booking Rejected] booking_enabled = "${bookingEnabled}"`);
      return NextResponse.json(
        { 
          error: 'Booking is currently disabled',
          message: bookingMessage 
        },
        { status: 403 }
      );
    }
    console.log(`[Booking Allowed] booking_enabled = "${bookingEnabled}"`);

    const body = await request.json();

    // Validate input
    const validation = bookingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid booking data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { branchId, serviceId, staffId, date, time, timeSlotId, customerName, customerPhone, price, note, userId } = validation.data;


    // Convert staffId to number (empId)
    const empId = parseInt(staffId);
    if (isNaN(empId)) {
      return NextResponse.json(
        { error: 'Invalid staff ID' },
        { status: 400 }
      );
    }

    // Store time slot ID in book_time column
    // If timeSlotId is provided, use it; otherwise extract start time from time range
    let bookTime: string | null = null;
    if (timeSlotId) {
      // Store the full time slot ID (e.g., "t-0-08:30-09:30")
      bookTime = timeSlotId;
    } else if (time) {
      // Fallback: Extract start time from time range (e.g., "08:30 - 09:30" -> "08:30")
      if (time.includes(' - ')) {
        bookTime = time.split(' - ')[0].trim();
      } else {
        bookTime = time.trim();
      }
    }

    // Convert branchId and serviceId to numbers
    const branchIdNum = branchId ? parseInt(branchId) : null;
    const serviceIdNum = serviceId ? parseInt(serviceId) : null;

    // Convert price to Decimal (Prisma Decimal type)
    let priceDecimal: number | null = null;
    if (price !== undefined && price !== null) {
      priceDecimal = typeof price === 'number' ? price : parseFloat(String(price));
      if (isNaN(priceDecimal)) {
        priceDecimal = null;
      }
    }

    // Parse date string - keep as string for raw SQL to preserve exact date
    // This avoids timezone issues where Prisma converts Date to UTC before saving
    // Date string format: "YYYY-MM-DD" (local date, not UTC)
    let bookDateStr: string;
    const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      // Use the date string directly (YYYY-MM-DD format)
      bookDateStr = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    } else {
      // Fallback: extract date part from ISO string
      const dateOnly = date.split('T')[0];
      const parsedMatch = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (parsedMatch) {
        bookDateStr = `${parsedMatch[1]}-${parsedMatch[2]}-${parsedMatch[3]}`;
      } else {
        // Last resort: parse as Date and extract local date components
        const parsedDate = new Date(date);
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        bookDateStr = `${year}-${month}-${day}`;
      }
    }
    
    console.log(`[Booking] Date received: "${date}", parsed to: "${bookDateStr}"`);

    // Check if slot is already booked before creating new booking
    // This prevents race condition where multiple users try to book the same slot
    try {
      // Parse time slot to extract start and end time
      let startTime = '';
      let endTime = '';
      const timeStr = bookTime?.trim() || '';
      
      if (timeStr.startsWith('t-')) {
        // Format: "t-0-08:30-09:30"
        const timeMatch = timeStr.match(/(\d{2}:\d{2})-(\d{2}:\d{2})$/);
        if (timeMatch) {
          startTime = timeMatch[1];
          endTime = timeMatch[2];
        }
      } else if (timeStr.includes(' - ')) {
        // Format: "08:30 - 09:30"
        const parts = timeStr.split(' - ');
        startTime = parts[0].trim();
        endTime = parts[1]?.trim() || '';
      } else {
        startTime = timeStr;
      }

      console.log(`[Booking] Checking for conflicts: date="${bookDateStr}", time="${timeStr}", startTime="${startTime}", endTime="${endTime}", empId=${empId}`);

      // Check for existing bookings with the same staff, date, and time
      // This includes regular bookings AND "off" bookings (booker_name = "off")
      // Both types of bookings will block new bookings from being created
      const existingBookings = await prisma.$queryRaw<Array<{
        id: number;
        booker_name: string;
        book_time: string;
      }>>`
        SELECT id, booker_name, book_time
        FROM booking
        WHERE emp_id = ${empId}
          AND DATE(book_date) = ${bookDateStr}
          AND (
            -- Exact match
            book_time = ${timeStr}
            -- Match time slot format "t-X-HH:mm-HH:mm"
            OR (${startTime} != '' AND ${endTime} != '' AND book_time LIKE ${`t-%-${startTime}-${endTime}`})
            -- Match time range format "HH:mm - HH:mm"
            OR (${startTime} != '' AND ${endTime} != '' AND book_time = ${`${startTime} - ${endTime}`})
            -- Match if booking starts at same time
            OR (${startTime} != '' AND (
              book_time LIKE ${`t-%-${startTime}-%`}
              OR book_time LIKE ${`${startTime} - %`}
              OR book_time = ${startTime}
            ))
          )
          AND (status IS NULL OR status = 'pending' OR status = 'confirmed' OR status = 'completed')
      `;

      console.log(`[Booking] Found ${existingBookings.length} existing bookings for this slot (including "off" bookings)`);

      if (existingBookings && existingBookings.length > 0) {
        const existing = existingBookings[0];
        const isOff = existing.booker_name === 'off' || existing.booker_name === 'Off' || existing.booker_name === 'OFF';
        console.warn(`[Booking Rejected] Slot already booked by: ${existing.booker_name}, time: ${existing.book_time}, isOff: ${isOff}`);
        return NextResponse.json(
          { 
            error: 'Slot already booked',
            message: isOff 
              ? `ช่วงเวลานี้พนักงานหยุด กรุณาเลือก slot อื่น`
              : `ช่วงเวลานี้มีคนจองแล้ว กรุณาเลือก slot อื่น`
          },
          { status: 409 } // Conflict
        );
      }
    } catch (checkError: any) {
      console.error('Error checking existing bookings:', checkError);
      // Continue with booking creation if check fails (should not block)
    }

    // Generate sequential booking ID
    // Find the highest booking ID number and increment by 1
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
        // Extract number from booking ID (e.g., "BK-000018" -> 18)
        const match = result[0].bookingId.match(/BK-(\d+)/);
        if (match) {
          nextBookingNumber = parseInt(match[1], 10) + 1;
        }
      }
    } catch (error) {
      console.error('Error finding max booking ID, starting from 1:', error);
      // If column doesn't exist yet, start from 1
      nextBookingNumber = 1;
    }

    // Format booking ID (e.g., BK-000001, BK-000002, etc.)
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

    // Create booking in database using raw SQL to preserve exact date
    // This avoids timezone issues where Prisma converts Date to UTC before saving
    let booking: { id: number } = { id: 0 };
    try {
      // Insert using raw SQL to control date format exactly
      await prisma.$executeRaw`
        INSERT INTO booking (
          emp_id, branch_id, service_id, price, book_date, book_time,
          booker_name, booker_tel, note1, note2, note3, note4, note5,
          booking_id, cid, line_id, created_at
        ) VALUES (
          ${empId},
          ${branchIdNum && !isNaN(branchIdNum) ? branchIdNum : null},
          ${serviceIdNum && !isNaN(serviceIdNum) ? serviceIdNum : null},
          ${priceDecimal !== null ? priceDecimal : null},
          ${bookDateStr},
          ${bookTime},
          ${customerName},
          ${customerPhone},
          ${"online"},
          ${null},
          ${null},
          ${note || ''},
          ${bookingCreatedAt},
          ${bookingId},
          ${null},
          ${userId || null},
          ${bookingCreatedAt}
        )
      `;
      
      // Get the last inserted ID
      const lastInsertResult = await prisma.$queryRaw<Array<{ id: bigint }>>`
        SELECT LAST_INSERT_ID() as id
      `;
      // Convert BigInt to Number (safe for booking IDs)
      booking = { id: Number(lastInsertResult[0]?.id || 0) };
      
      console.log(`[Booking] Created booking ID: ${booking.id}, date saved: ${bookDateStr}`);
    } catch (error: any) {
      console.error('Error creating booking with raw SQL:', error);
      // If raw SQL fails (e.g., column doesn't exist), fallback to Prisma ORM
      // But we need to adjust for timezone
      const bookDateForPrisma = new Date(bookDateStr + 'T12:00:00'); // Noon to avoid timezone shift
      const bookingData: any = {
        empId: empId,
        branchId: branchIdNum && !isNaN(branchIdNum) ? branchIdNum : null,
        serviceId: serviceIdNum && !isNaN(serviceIdNum) ? serviceIdNum : null,
        price: priceDecimal !== null ? priceDecimal : null,
        bookDate: bookDateForPrisma,
        bookTime: bookTime,
        bookerName: customerName,
        bookerTel: customerPhone,
        note1: "online",
        note2: null,
        note3: null,
        note4: note || '',
        note5: bookingCreatedAt,
        bookingId: bookingId,
        cid: null,
        lineId: userId || null,
      };

      try {
        const created = await prisma.booking.create({ data: bookingData });
        booking = { id: created.id };
      } catch (createError: any) {
        // If bookingId column doesn't exist, create without it
        if (createError?.code === 'P2003' || createError?.message?.includes('booking_id')) {
          console.warn('bookingId column not found, creating without it');
          const { bookingId: _, ...bookingDataWithoutId } = bookingData;
          const created = await prisma.booking.create({ data: bookingDataWithoutId });
          booking = { id: created.id };
        } else {
          throw createError;
        }
      }
    }


    // Broadcast event to admin bookings page via SSE (fire and forget)
    // Don't await to avoid blocking the response
    const baseUrl = request.url.split('/api')[0]; // Get base URL from request
    fetch(`${baseUrl}/api/admin/bookings/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: booking.id,
        timestamp: new Date().toISOString(),
      }),
    }).catch((err) => {
      // Log but don't fail the booking creation if broadcast fails
      console.error('Failed to broadcast booking event:', err);
    });

    let weeklyBookingCount: number | null = null;
    if (userId && userId.trim().length > 0) {
      try {
        const { weekStart, weekEnd } = getWeekRangeFromDate(bookDateStr);
        const weeklyCountRows = await prisma.$queryRaw<Array<{ total: bigint | number }>>`
          SELECT COUNT(*) as total
          FROM booking
          WHERE line_id = ${userId}
            AND DATE(book_date) BETWEEN ${weekStart} AND ${weekEnd}
            AND (status IS NULL OR LOWER(status) NOT IN ('cancelled', 'canceled'))
        `;

        const total = weeklyCountRows[0]?.total;
        weeklyBookingCount = typeof total === 'bigint' ? Number(total) : Number(total || 0);
      } catch (countError) {
        console.error('Failed to calculate weekly booking count:', countError);
      }
    }

    return NextResponse.json({
      success: true,
      bookingId: bookingId,
      weeklyBookingCount
    }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creating booking:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });

    // Return more detailed error message
    const errorMessage = error?.message || 'Failed to create booking';
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: errorMessage,
        details: error?.meta || error?.code || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
