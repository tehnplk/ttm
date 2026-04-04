import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

// Update staff (using Employee model from ttm.sql)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const authError = await requireApiAuth(request);
    if (authError) return authError;
    const { id } = await params;
    const employeeId = parseInt(id);
    if (isNaN(employeeId)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 },
      );
    }

    const currentEmployee = await prisma.$queryRaw<Array<{
      id: number;
      prename: string | null;
      fname: string | null;
      lname: string | null;
      nickname: string | null;
      sex: string | null;
      birth: Date | null;
      agey: number | null;
      position: number | null;
      branch_id: number | null;
      tel: string | null;
      num_star: number | null;
      is_active: string | null;
      image: string | null;
      employee_number: string | null;
    }>>`
      SELECT
        id,
        prename,
        fname,
        lname,
        nickname,
        sex,
        birth,
        agey,
        position,
        branch_id,
        tel,
        num_star,
        is_active,
        image,
        employee_number
      FROM employee
      WHERE id = ${employeeId}
      LIMIT 1
    `;

    const existingEmployee = currentEmployee[0];
    if (!existingEmployee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    const body = await request.json();

    const prename = typeof body.prename === "string" && body.prename.trim()
      ? body.prename.trim()
      : existingEmployee.prename;
    const fname = typeof body.fname === "string" && body.fname.trim()
      ? body.fname.trim()
      : existingEmployee.fname;
    const lname = typeof body.lname === "string" && body.lname.trim()
      ? body.lname.trim()
      : existingEmployee.lname;
    const nickname = typeof body.nickname === "string"
      ? body.nickname.trim() || existingEmployee.nickname
      : existingEmployee.nickname;
    const sex = typeof body.sex === "string" && body.sex.trim()
      ? body.sex.trim()
      : existingEmployee.sex;
    const birth = typeof body.birth === "string" && body.birth.trim()
      ? new Date(body.birth)
      : existingEmployee.birth;
    const agey = typeof body.agey === "number"
      ? body.agey
      : typeof body.agey === "string" && body.agey.trim()
        ? parseInt(body.agey, 10)
        : existingEmployee.agey;
    const position = typeof body.position === "number"
      ? body.position
      : typeof body.position === "string" && body.position.trim()
        ? parseInt(body.position, 10)
        : existingEmployee.position;
    const branch_id = typeof body.branch_id === "number"
      ? body.branch_id
      : typeof body.branch_id === "string" && body.branch_id.trim()
        ? parseInt(body.branch_id, 10)
        : existingEmployee.branch_id;
    const tel = typeof body.tel === "string"
      ? body.tel.trim() || existingEmployee.tel
      : existingEmployee.tel;
    const num_star = typeof body.num_star === "number"
      ? body.num_star
      : typeof body.num_star === "string" && body.num_star.trim()
        ? parseInt(body.num_star, 10)
        : existingEmployee.num_star;
    const is_active = typeof body.is_active === "string" && body.is_active.trim()
      ? body.is_active.trim()
      : existingEmployee.is_active;
    const image = typeof body.image === "string"
      ? body.image.trim() || existingEmployee.image
      : existingEmployee.image;
    const employee_number = typeof body.employee_number === "string"
      ? body.employee_number.trim() || existingEmployee.employee_number
      : existingEmployee.employee_number;

    if (!fname) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อพนักงาน" },
        { status: 400 },
      );
    }

    // Use raw query to update employee
    await prisma.$executeRaw`
      UPDATE employee
      SET 
        prename = ${prename},
        fname = ${fname},
        lname = ${lname},
        nickname = ${nickname},
        sex = ${sex},
        birth = ${birth},
        agey = ${agey},
        position = ${position},
        branch_id = ${branch_id},
        tel = ${tel},
        num_star = ${num_star},
        is_active = ${is_active},
        image = ${image},
        employee_number = ${employee_number},
        updated_at = NOW()
      WHERE id = ${employeeId}
    `;

    // Get branches for mapping
    const branches = await prisma.branch.findMany();
    const branchMap = new Map(branches.map(b => [b.id, b.name]));

    return NextResponse.json({
      id: String(employeeId),
      prename,
      fname,
      lname,
      sex,
      birth: birth ? birth.toISOString().split('T')[0] : null,
      agey,
      position,
      branch_id,
      branch_name: branch_id ? branchMap.get(branch_id) || null : null,
      tel,
      num_star,
      is_active,
      image,
      employee_number,
    });
  } catch (error) {
    console.error("Admin staff PUT error", error);
    return NextResponse.json(
      { error: "Failed to update staff", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

// Delete staff (using Employee model from ttm.sql)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const authError = await requireApiAuth(request);
    if (authError) return authError;
    const { id } = await params;
    const employeeId = parseInt(id);
    if (isNaN(employeeId)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 },
      );
    }

    // Use raw query to delete employee (or set is_active to 'no')
    await prisma.$executeRaw`
      UPDATE employee
      SET is_active = 'no', updated_at = NOW()
      WHERE id = ${employeeId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin staff DELETE error", error);
    return NextResponse.json(
      { error: "Failed to delete staff", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
