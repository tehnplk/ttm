import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Helper function to format date as YYYY-MM-DD without timezone issues
function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Update staff holiday
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const holidayId = parseInt(id);
    
    if (isNaN(holidayId)) {
      return NextResponse.json(
        { error: "Invalid holiday ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const staffId = typeof body.staffId === "string" ? body.staffId.trim() : "";
    // Convert branchId to Int if provided
    let branchId: number | null = null;
    if (body.branchId !== null && body.branchId !== undefined) {
      const branchIdNum = typeof body.branchId === "string" ? parseInt(body.branchId.trim()) : body.branchId;
      branchId = !isNaN(branchIdNum) ? branchIdNum : null;
    }
    const holidayDate = typeof body.holidayDate === "string" ? body.holidayDate.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";

    if (!staffId || !holidayDate) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
        { status: 400 },
      );
    }

    // Update holiday
    const updated = await prisma.staffHoliday.update({
      where: { id: holidayId },
      data: {
        staffId,
        branchId: branchId || null,
        holidayDate: new Date(holidayDate),
        note: note || null,
      },
    });
    
    // Get employee name
    const empId = parseInt(updated.staffId);
    let staffName = `พนักงาน #${updated.staffId}`;
    if (!isNaN(empId)) {
      const employeeName = await prisma.$queryRawUnsafe<Array<{ prename: string; fname: string; lname: string }>>(
        `SELECT prename, fname, lname FROM employee WHERE id = ${empId} LIMIT 1`
      );
      if (employeeName && employeeName.length > 0) {
        const e = employeeName[0];
        staffName = `${e.prename || ''}${e.fname || ''} ${e.lname || ''}`.trim() || staffName;
      }
    }

    return NextResponse.json({
      id: String(updated.id),
      staffId: updated.staffId,
      branchId: updated.branchId !== null ? updated.branchId : null,
      staffName,
      holidayDate: formatDateString(updated.holidayDate),
      note: updated.note || "",
    });
  } catch (error) {
    console.error("Admin staff holidays PUT error", error);
    return NextResponse.json(
      { error: "Failed to update staff holiday" },
      { status: 500 },
    );
  }
}

// Delete staff holiday
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const holidayId = parseInt(id);
    
    if (isNaN(holidayId)) {
      return NextResponse.json(
        { error: "Invalid holiday ID" },
        { status: 400 },
      );
    }

    await prisma.staffHoliday.delete({
      where: { id: holidayId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin staff holidays DELETE error", error);
    return NextResponse.json(
      { error: "Failed to delete staff holiday" },
      { status: 500 },
    );
  }
}

