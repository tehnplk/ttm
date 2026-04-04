import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Update schedule
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const staffId = typeof body.staffId === "string" ? body.staffId.trim() : "";
    const offDays = typeof body.offDays === "string" ? body.offDays.trim() : "[]";
    const busySlots = typeof body.busySlots === "string" ? body.busySlots.trim() : "{}";

    if (!staffId) {
      return NextResponse.json(
        { error: "กรุณาเลือกพนักงาน" },
        { status: 400 },
      );
    }

    const scheduleId = parseInt(id);
    if (isNaN(scheduleId)) {
      return NextResponse.json(
        { error: "Invalid schedule ID" },
        { status: 400 },
      );
    }

    const updated = await prisma.staffSchedule.update({
      where: { id: scheduleId },
      data: {
        staffId,
        offDays,
        busySlots,
      },
    });

    // Get employee name
    const empId = parseInt(staffId);
    let staffName = `พนักงาน #${staffId}`;
    if (!isNaN(empId)) {
      const employee = await prisma.$queryRaw<Array<{ prename: string; fname: string; lname: string }>>`
        SELECT prename, fname, lname 
        FROM employee 
        WHERE id = ${empId}
        LIMIT 1
      `;
      if (employee && employee.length > 0) {
        const e = employee[0];
        staffName = `${e.prename || ''}${e.fname || ''} ${e.lname || ''}`.trim() || staffName;
      }
    }

    return NextResponse.json({
      id: String(updated.id),
      staffId: updated.staffId,
      staffName,
      offDays: updated.offDays,
      busySlots: updated.busySlots,
    });
  } catch (error) {
    console.error("Admin schedule PUT error", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 },
    );
  }
}

// Delete schedule
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const scheduleId = parseInt(id);
    
    if (isNaN(scheduleId)) {
      return NextResponse.json(
        { error: "Invalid schedule ID" },
        { status: 400 },
      );
    }

    await prisma.staffSchedule.delete({
      where: { id: scheduleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin schedule DELETE error", error);
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 },
    );
  }
}

