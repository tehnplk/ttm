import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// List schedules
export async function GET() {
  try {
    const schedules = await prisma.staffSchedule.findMany({
      orderBy: { id: "asc" },
    });

    // Get employee names
    const employeeIds = schedules.map(s => parseInt(s.staffId)).filter(id => !isNaN(id));
    let employees: Array<{ id: number; prename: string; fname: string; lname: string }> = [];
    
    if (employeeIds.length > 0) {
      const idsString = employeeIds.join(',');
      employees = await prisma.$queryRawUnsafe<Array<{ id: number; prename: string; fname: string; lname: string }>>(
        `SELECT id, prename, fname, lname FROM employee WHERE id IN (${idsString})`
      );
    }

    const employeeMap = new Map(employees.map(e => [String(e.id), `${e.prename || ''}${e.fname || ''} ${e.lname || ''}`.trim()]));

    return NextResponse.json({
      schedules: schedules.map((s) => ({
        id: String(s.id),
        staffId: s.staffId,
        staffName: employeeMap.get(s.staffId) || `พนักงาน #${s.staffId}`,
        offDays: s.offDays,
        busySlots: s.busySlots,
      })),
    });
  } catch (error) {
    console.error("Admin schedule GET error", error);
    return NextResponse.json(
      { error: "Failed to load schedules" },
      { status: 500 },
    );
  }
}

// Create schedule
export async function POST(request: Request) {
  try {
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

    // Validate that employee exists
    const empId = parseInt(staffId);
    if (isNaN(empId)) {
      return NextResponse.json(
        { error: "Invalid staff ID" },
        { status: 400 },
      );
    }

    const employee = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
      `SELECT id FROM employee WHERE id = ${empId} LIMIT 1`
    );

    if (!employee || employee.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบพนักงานที่ระบุ" },
        { status: 404 },
      );
    }

    // Check if schedule already exists for this staff
    const existing = await prisma.staffSchedule.findUnique({
      where: { staffId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "ตารางหยุดพนักงานสำหรับพนักงานนี้มีอยู่แล้ว กรุณาใช้การแก้ไขแทน" },
        { status: 409 },
      );
    }

    const created = await prisma.staffSchedule.create({
      data: {
        staffId,
        offDays,
        busySlots,
      },
    });

    // Get employee name (empId already defined above)
    let staffName = `พนักงาน #${staffId}`;
    const employeeName = await prisma.$queryRawUnsafe<Array<{ prename: string; fname: string; lname: string }>>(
      `SELECT prename, fname, lname FROM employee WHERE id = ${empId} LIMIT 1`
    );
    if (employeeName && employeeName.length > 0) {
      const e = employeeName[0];
      staffName = `${e.prename || ''}${e.fname || ''} ${e.lname || ''}`.trim() || staffName;
    }

    return NextResponse.json(
      {
        id: String(created.id),
        staffId: created.staffId,
        staffName,
        offDays: created.offDays,
        busySlots: created.busySlots,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Admin schedule POST error", error);
    return NextResponse.json(
      { 
        error: "Failed to create schedule",
        details: error?.message || String(error)
      },
      { status: 500 },
    );
  }
}

