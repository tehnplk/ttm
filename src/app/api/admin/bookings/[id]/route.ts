import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";
import { auth } from "@/authConfig";

// Update booking
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const { id } = await params;
    const bookingId = parseInt(id);
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { error: "Invalid booking ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const empId = typeof body.empId === "number" ? body.empId : typeof body.empId === "string" ? parseInt(body.empId) : null;
    const bookDate = typeof body.bookDate === "string" ? body.bookDate : "";
    const bookTime = typeof body.bookTime === "string" ? body.bookTime.trim() : "";
    const bookerName = typeof body.bookerName === "string" ? body.bookerName.trim() : "";
    const bookerTel = typeof body.bookerTel === "string" ? body.bookerTel.trim() : "";
    const note1 = typeof body.note1 === "string" ? body.note1.trim() : null;
    const note2 = typeof body.note2 === "string" ? body.note2.trim() : null;
    const note3 = typeof body.note3 === "string" ? body.note3.trim() : null;
    const cid = typeof body.cid === "string" ? body.cid.trim() : null;
    const lineId = typeof body.lineId === "string" ? body.lineId.trim() : null;
    const status = typeof body.status === "string" ? body.status.trim() : null;
    const confirmDatetime = body.confirmDatetime ? new Date(body.confirmDatetime) : null;
    const branchId = body.branchId !== null && body.branchId !== undefined 
      ? (typeof body.branchId === "number" ? body.branchId : typeof body.branchId === "string" ? parseInt(body.branchId) : null)
      : null;
    const serviceId = body.serviceId !== null && body.serviceId !== undefined
      ? (typeof body.serviceId === "number" ? body.serviceId : typeof body.serviceId === "string" ? parseInt(body.serviceId) : null)
      : null;

    if (!empId || !bookDate || !bookTime || !bookerName || !bookerTel) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน (empId, bookDate, bookTime, bookerName, bookerTel)" },
        { status: 400 },
      );
    }

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
    
    console.log(`[Admin Booking Update] Date received: "${bookDate}", parsed to: "${bookDateStr}"`);

    // Use raw SQL to update date to preserve exact date (avoid timezone issues)
    try {
      await prisma.$executeRaw`
        UPDATE booking SET
          emp_id = ${empId},
          book_date = ${bookDateStr},
          book_time = ${bookTime},
          booker_name = ${bookerName},
          booker_tel = ${bookerTel},
          note1 = ${note1},
          note2 = ${note2},
          note3 = ${note3},
          note4 = ${body.note4 || ""},
          note5 = ${body.note5 || ""},
          cid = ${cid},
          line_id = ${lineId},
          branch_id = ${branchId},
          service_id = ${serviceId},
          status = ${status || "pending"},
          confirm_datetime = ${confirmDatetime}
        WHERE id = ${bookingId}
      `;

      // Fetch updated booking
      const updated = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { employee: true },
      });

      if (!updated) {
        return NextResponse.json({ error: "Booking not found after update" }, { status: 404 });
      }

      return NextResponse.json({
        id: updated.id,
        empId: updated.empId,
        employeeName: updated.employee
          ? `${updated.employee.prename}${updated.employee.fname} ${updated.employee.lname}`
          : "ไม่ระบุ",
        bookDate: bookDateStr, // Return the exact date string we saved
        bookTime: updated.bookTime,
        bookerName: updated.bookerName,
        bookerTel: updated.bookerTel,
        note1: updated.note1,
        note2: updated.note2,
        note3: updated.note3,
        note4: updated.note4,
        note5: updated.note5,
        cid: updated.cid,
        lineId: updated.lineId,
        status: updated.status,
        confirmDatetime: updated.confirmDatetime?.toISOString() || null,
      });
    } catch (rawError: any) {
      console.error('Error updating booking with raw SQL:', rawError);
      // Fallback to Prisma ORM with noon time to avoid timezone shift
      const bookDateForPrisma = new Date(bookDateStr + 'T12:00:00');

    const updateData: any = {
        empId,
        bookDate: bookDateForPrisma,
        bookTime,
        bookerName,
        bookerTel,
        note1,
        note2,
        note3,
        note4: body.note4 || "",
        note5: body.note5 || "",
        cid,
    };

    // Only update lineId if it's explicitly provided
    if (body.lineId !== undefined && body.lineId !== null) {
      updateData.lineId = typeof body.lineId === "string" ? body.lineId.trim() : null;
    }

    // Update branchId if provided
    if (branchId !== null && branchId !== undefined) {
      updateData.branchId = branchId;
    }

    // Update serviceId if provided
    if (serviceId !== null && serviceId !== undefined) {
      updateData.serviceId = serviceId;
    }

    // Update status if provided
    if (status !== null && status !== undefined) {
      updateData.status = status;
    }

    // Update confirm_datetime if provided
    if (confirmDatetime !== null && confirmDatetime !== undefined) {
      updateData.confirmDatetime = confirmDatetime;
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        employee: true,
      },
    });

    return NextResponse.json({
      id: updated.id,
      empId: updated.empId,
      employeeName: updated.employee ? `${updated.employee.prename}${updated.employee.fname} ${updated.employee.lname}` : "ไม่ระบุ",
      branchId: updated.branchId ? String(updated.branchId) : null,
      serviceId: updated.serviceId ? String(updated.serviceId) : null,
      bookDate: bookDateStr, // Return the exact date string we saved
      bookTime: updated.bookTime,
      bookerName: updated.bookerName,
      bookerTel: updated.bookerTel,
      note1: updated.note1,
      note2: updated.note2,
      note3: updated.note3,
      note4: updated.note4,
      note5: updated.note5,
      cid: updated.cid,
      lineId: updated.lineId,
      status: updated.status,
      confirmDatetime: updated.confirmDatetime ? updated.confirmDatetime.toISOString() : null,
    });
    } // End of catch block for raw SQL fallback
  } catch (error) {
    console.error("Admin bookings PUT error", error);
    return NextResponse.json(
      { error: "Failed to update booking", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

// Delete booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  
  // Get authenticated user info for logging
  const session = await auth();
  let adminUsername = "admin";
  if (session?.user) {
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
    const { id } = await params;
    const bookingId = parseInt(id);
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { error: "Invalid booking ID" },
        { status: 400 },
      );
    }

    // Get booking details before deletion for logging
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        employee: true,
        branch: true,
        service: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 },
      );
    }

    // Prepare log data before deletion
    const staffName = booking.employee 
      ? `${booking.employee.prename || ''}${booking.employee.fname || ''} ${booking.employee.lname || ''}`.trim()
      : null;

    // Delete the booking
    await prisma.booking.delete({
      where: { id: bookingId },
    });

    // Log the deletion to database
    try {
      // Use raw SQL to insert log (in case Prisma model is not yet generated)
      await prisma.$executeRaw`
        INSERT INTO booking_delete_log (
          booking_id, customer_name, customer_phone, line_id, book_date, book_time,
          staff_id, staff_name, branch_id, branch_name, service_id, service_name,
          deleted_by, deleted_at
        ) VALUES (
          ${bookingId}, ${booking.bookerName}, ${booking.bookerTel}, ${booking.lineId || null},
          ${booking.bookDate}, ${booking.bookTime || null},
          ${booking.empId || null}, ${staffName || null},
          ${booking.branchId || null}, ${booking.branch?.name || null},
          ${booking.serviceId || null}, ${booking.service?.name || null},
          ${adminUsername}, NOW()
        )
      `;
    } catch (logError) {
      // If log table doesn't exist yet, just log to console
      console.error("Failed to save delete log to database:", logError);
      const now = new Date();
      const logTime = now.toISOString().replace('T', ' ').substring(0, 19);
      const logMessage = `[BOOKING_DELETE] Booking ID: ${bookingId}, Customer: ${booking.bookerName} (${booking.bookerTel}), Date: ${booking.bookDate.toISOString().split('T')[0]}, Time: ${booking.bookTime}, Staff: ${staffName || 'N/A'}, Branch: ${booking.branch?.name || 'N/A'}, Service: ${booking.service?.name || 'N/A'}, Deleted by admin: ${adminUsername}, Deleted at: ${logTime}`;
      console.log(logMessage);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin bookings DELETE error", error);
    return NextResponse.json(
      { error: "Failed to delete booking", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

