import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// List staff for public booking page (using Employee model from ttm.sql)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const date = searchParams.get('date'); // ISO date string for checking holidays
    const time = searchParams.get('time'); // Time slot for checking existing bookings

    // Build query conditionally
    let employees: Array<{
      id: number;
      prename: string;
      fname: string;
      lname: string;
      position: number | null;
      branch_id: number | null;
      sex: string | null;
      agey: number | null;
      image: string | null;
      nickname: string | null;
    }>;

    // First, get all active employees
    // Try to get branch_id if column exists, otherwise use NULL
    try {
      employees = await prisma.$queryRaw<Array<{
        id: number;
        prename: string;
        fname: string;
        lname: string;
        position: number | null;
        branch_id: number | null;
        sex: string | null;
        agey: number | null;
        image: string | null;
        nickname: string | null;
      }>>`
        SELECT 
          id,
          prename,
          fname,
          lname,
          position,
          COALESCE(branch_id, NULL) as branch_id,
          sex,
          agey,
          COALESCE(image, NULL) as image,
          nickname
        FROM employee
        WHERE is_active = 'yes'
        ORDER BY (employee_number IS NULL), CAST(employee_number AS UNSIGNED) ASC, fname ASC
      `;
    } catch (err: any) {
      // If branch_id column doesn't exist, query without it
      if (err.message?.includes('branch_id') || err.message?.includes('Unknown column')) {
        employees = await prisma.$queryRaw<Array<{
          id: number;
          prename: string;
          fname: string;
          lname: string;
          position: number | null;
          branch_id: number | null;
          sex: string | null;
          agey: number | null;
          image: string | null;
          nickname: string | null;
        }>>`
          SELECT 
            id,
            prename,
            fname,
            lname,
            position,
            NULL as branch_id,
            sex,
            agey,
            COALESCE(image, NULL) as image,
            nickname
          FROM employee
          WHERE is_active = 'yes'
          ORDER BY (employee_number IS NULL), CAST(employee_number AS UNSIGNED) ASC, fname ASC
        `;
      } else {
        throw err;
      }
    }

    // Filter by branch_id if provided
    if (branchId) {
      const branchIdNum = parseInt(branchId);
      if (!isNaN(branchIdNum)) {
        // Filter employees by branch_id
        employees = employees.filter(e => {
          // If branch_id is NULL, include the employee (they can work at any branch)
          // Otherwise, check if branch_id matches
          return e.branch_id === null || e.branch_id === branchIdNum;
        });
      }
    }

    // Get staff holidays for the given date and branch if provided
    // Query: SELECT * FROM staffholiday WHERE branch_id = ? AND holiday_date = ?
    // If no data found, show all staff (holidayStaffIds will be empty Set)
    let holidayStaffIds: Set<string> = new Set();
    if (date && branchId) {
      try {
        const dateObj = new Date(date);
        const branchIdNum = parseInt(branchId);
        // Check if date and branchId are valid
        if (!isNaN(dateObj.getTime()) && !isNaN(branchIdNum)) {
          // Query holidays for this specific branch and date
          const holidays = await prisma.staffHoliday.findMany({
            where: {
              holidayDate: dateObj,
              branchId: branchIdNum,
            },
          });
          holidayStaffIds = new Set(holidays.map(h => h.staffId));
          if (holidays.length === 0) {
            // No holidays found, showing all staff for this branch
          }
        }
      } catch (err) {
        console.error('Error loading staff holidays:', err);
        // Continue without filtering holidays if there's an error
        // This means show all staff
      }
    } else {
    }

    // Check existing bookings for the selected date and time
    let bookedStaffIds: Set<string> = new Set();
    let offStaffIds: Set<string> = new Set();
    if (date) {
      try {
        // Keep date as string to avoid timezone issues when querying database
        // This ensures we query for the exact date the user selected
        let dateStr: string;
        const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          // Use the date string directly (YYYY-MM-DD format)
          dateStr = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        } else {
          // Fallback: try to extract date from other formats
          const dateOnly = date.split('T')[0];
          const parsedMatch = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (parsedMatch) {
            dateStr = `${parsedMatch[1]}-${parsedMatch[2]}-${parsedMatch[3]}`;
          } else {
            dateStr = date;
          }
        }
        
        console.log(`[Staff API] Date check - input: "${date}", using dateStr: "${dateStr}"`);

        // Check for "off" bookings - ONLY for the specific time slot requested
        // This ensures staff is only marked as "off" for the exact time slot, not the entire day
        // If no time is provided, we still need to check but we won't mark anyone as off
        // (The admin page handles this differently)

        // Then check for regular bookings with matching time (only if time is provided)
        if (time) {
          // Extract time from time slot - handle multiple formats
          // Normalize time format: convert dots to colons (e.g., "13.00" -> "13:00")
          let timeStr = time.trim().replace(/\./g, ':');
          let startTime = '';
          let endTime = '';
          
          // If time is a time slot ID (e.g., "t-3-15:00-17:00")
          if (timeStr.startsWith('t-')) {
            const timeMatch = timeStr.match(/(\d{2}:\d{2})[\s-]+(\d{2}:\d{2})/);
            if (timeMatch) {
              startTime = timeMatch[1];
              endTime = timeMatch[2];
              timeStr = `${startTime} - ${endTime}`;
            } else {
              // Fallback: split by '-' and take last two parts
              const parts = timeStr.split('-');
              if (parts.length >= 4 && /^\d{2}:\d{2}$/.test(parts[parts.length - 2]) && /^\d{2}:\d{2}$/.test(parts[parts.length - 1])) {
                startTime = parts[parts.length - 2];
                endTime = parts[parts.length - 1];
                timeStr = `${startTime} - ${endTime}`;
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
            timeStr = `${startTime} - ${endTime}`;
          } else {
            // Just start time: "15:00"
            startTime = timeStr;
          }

          console.log(`[Staff API] Checking bookings for date="${dateStr}", time="${time}"`);
          console.log(`[Staff API] Normalized time: "${timeStr}", Parsed: startTime="${startTime}", endTime="${endTime}"`);

          // Check for "off" bookings for the SPECIFIC time slot (not entire day)
          // This ensures staff is only marked as "off" for the exact time slot they have off
          const offBookings = await prisma.$queryRaw<Array<{
            emp_id: number;
            book_time: string;
            booker_name: string;
            status: string | null;
          }>>`
            SELECT emp_id, book_time, booker_name, status
            FROM booking
            WHERE DATE(book_date) = ${dateStr}
              AND UPPER(TRIM(booker_name)) = 'OFF'
              AND (
                -- Exact match for full time range (with space)
                book_time = ${timeStr}
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
              AND (status IS NULL OR status = 'pending' OR status = 'confirmed' OR status = 'completed')
          `;
          
          offBookings.forEach(b => {
            offStaffIds.add(String(b.emp_id));
          });
          
          console.log(`[Staff API] Found ${offBookings.length} "off" bookings for time slot ${timeStr}:`, offBookings.map(b => `emp_id=${b.emp_id}, time="${b.book_time}"`));
          console.log(`[Staff API] Off staff IDs (will be marked as isOff):`, Array.from(offStaffIds));

          // Check for existing bookings with matching time (excluding "off" bookings)
          // book_time can be: "15:00", "15:00 - 17:00", "15:00-17:00", or "t-3-15:00-17:00"
          // IMPORTANT: Only match if the start time is EXACTLY the same (not just contains the time)
          // We need to be careful with LIKE patterns to avoid false matches
          // For example: "13:00 - 15:00" should NOT match "15:00 - 17:00"
          const existingBookings = await prisma.$queryRaw<Array<{
            emp_id: number;
            book_time: string;
            booker_name: string;
            status: string | null;
          }>>`
            SELECT emp_id, book_time, booker_name, status
            FROM booking
            WHERE DATE(book_date) = ${dateStr}
              AND UPPER(TRIM(booker_name)) != 'OFF'
              AND (
                -- Exact match for full time range (with space)
                book_time = ${timeStr}
                OR book_time = ${`${startTime} - ${endTime}`}
                -- Exact match for full time range (without space)
                OR book_time = ${`${startTime}-${endTime}`}
                -- Match time slot ID format: "t-X-15:00-17:00" (exact end time match)
                OR (${endTime} != '' AND book_time LIKE ${`t-%-${startTime}-${endTime}`})
                -- Match if booking time starts with the same start time exactly
                -- Important: Use precise patterns to avoid false matches
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
              AND (status IS NULL OR status = 'pending' OR status = 'confirmed' OR status = 'completed')
          `;
          
          console.log(`[Staff API] Found ${existingBookings.length} matching regular bookings (after time filter):`, existingBookings.map(b => `emp_id=${b.emp_id}, time="${b.book_time}", name="${b.booker_name}", status="${b.status}"`));
          
          // Add regular bookings to bookedStaffIds (excluding "off" bookings)
          existingBookings.forEach(b => {
            bookedStaffIds.add(String(b.emp_id));
          });
          
          console.log(`[Staff API] Booked staff IDs (will be marked as hasBooking):`, Array.from(bookedStaffIds));
        }
      } catch (err) {
        console.error('Error checking existing bookings:', err);
        // Continue without filtering if there's an error
      }
    }

    // Show all employees (don't filter out)
    // Staff on holiday or "off" will be marked with flags and disabled in the UI
    const filteredStaff = employees.map((e) => {
      const employeeId = String(e.id);
      const isOnHoliday = holidayStaffIds.has(employeeId);
      const isOff = offStaffIds.has(employeeId);
      // If staff is on holiday, also mark as "off" (both mean the staff is unavailable)
      const isUnavailable = isOnHoliday || isOff;
      
      return {
        id: employeeId,
        name: `${e.prename || ''}${e.fname || ''} ${e.lname || ''}`.trim(),
        role: e.position?.toString() || "",
        nickname: e.nickname || "",
        image: e.image ? (e.image.startsWith('/') ? e.image : `/images/${e.image}`) : "/placeholder-staff.png",
        specialty: [],
        sex: e.sex || "",
        age: e.agey || null,
        hasBooking: bookedStaffIds.has(employeeId), // Add flag for existing booking
        isOff: isUnavailable, // Add flag for staff marked as "off" or on holiday
      };
    });

    console.log(`[Staff API] Total staff: ${filteredStaff.length}, Off staff count: ${offStaffIds.size}, Holiday staff count: ${holidayStaffIds.size}`);
    console.log(`[Staff API] Staff list:`, filteredStaff.map(s => `${s.name} (id: ${s.id}, isOff: ${s.isOff}, hasBooking: ${s.hasBooking})`));

    return NextResponse.json({
      staff: filteredStaff,
    });
  } catch (error) {
    console.error("Staff GET error", error);
    return NextResponse.json(
      { 
        error: "Failed to load staff", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 },
    );
  }
}

