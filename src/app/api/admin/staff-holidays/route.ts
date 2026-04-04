import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Helper function to format date as YYYY-MM-DD without timezone issues
function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// List staff holidays
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const branchId = searchParams.get('branchId');

    const where: any = {};
    if (staffId) {
      where.staffId = staffId;
    }
    if (branchId) {
      const branchIdNum = parseInt(branchId);
      if (!isNaN(branchIdNum)) {
        where.branchId = branchIdNum;
      }
    }
    
    const holidays = await prisma.staffHoliday.findMany({
      where,
      orderBy: { holidayDate: "desc" },
    });

    // Get employee names
    const employeeIds = holidays.map(h => parseInt(h.staffId)).filter(id => !isNaN(id));
    let employees: Array<{ id: number; prename: string; fname: string; lname: string }> = [];
    
    if (employeeIds.length > 0) {
      const idsString = employeeIds.join(',');
      employees = await prisma.$queryRawUnsafe<Array<{ id: number; prename: string; fname: string; lname: string }>>(
        `SELECT id, prename, fname, lname FROM employee WHERE id IN (${idsString})`
      );
    }

    const employeeMap = new Map(employees.map(e => [String(e.id), `${e.prename || ''}${e.fname || ''} ${e.lname || ''}`.trim()]));

    return NextResponse.json({
      holidays: holidays.map((h) => ({
        id: String(h.id),
        staffId: h.staffId,
        branchId: h.branchId !== null ? h.branchId : null,
        staffName: employeeMap.get(h.staffId) || `พนักงาน #${h.staffId}`,
        holidayDate: formatDateString(h.holidayDate),
        note: h.note || "",
      })),
    });
  } catch (error) {
    console.error("Admin staff holidays GET error", error);
    return NextResponse.json(
      { error: "Failed to load staff holidays" },
      { status: 500 },
    );
  }
}

// Create staff holiday
export async function POST(request: Request) {
  try {
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

    // Create holiday
    const created = await prisma.staffHoliday.create({
      data: {
        staffId,
        branchId: branchId || null,
        holidayDate: new Date(holidayDate),
        note: note || null,
      },
    });
    
    // Get employee name
    const employeeName = await prisma.$queryRawUnsafe<Array<{ prename: string; fname: string; lname: string }>>(
      `SELECT prename, fname, lname FROM employee WHERE id = ${empId} LIMIT 1`
    );
    let staffName = `พนักงาน #${staffId}`;
    if (employeeName && employeeName.length > 0) {
      const e = employeeName[0];
      staffName = `${e.prename || ''}${e.fname || ''} ${e.lname || ''}`.trim() || staffName;
    }

    return NextResponse.json(
      {
        id: String(created.id),
        staffId: created.staffId,
        branchId: created.branchId !== null ? created.branchId : null,
        staffName,
        holidayDate: formatDateString(created.holidayDate),
        note: created.note || "",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Admin staff holidays POST error", error);
    return NextResponse.json(
      { 
        error: "Failed to create staff holiday",
        details: error?.message || String(error)
      },
      { status: 500 },
    );
  }
}

