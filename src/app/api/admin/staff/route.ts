import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

// List staff (using Employee model from ttm.sql)
export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    // Use raw query to get employees with branch_id and branch_name
    // Employee table may have branch_id and image fields that are not in Prisma schema
    const employees = await prisma.$queryRaw<Array<{
      id: number;
      prename: string;
      fname: string;
      lname: string;
      sex: string | null;
      birth: Date | null;
      agey: number | null;
      position: number | null;
      branch_id: number | null;
      tel: string | null;
      num_star: number | null;
      is_active: string | null;
      image: string | null;
      nickname: string | null;
      employee_number: string | null;
      created_at: Date | null;
      updated_at: Date | null;
    }>>`
      SELECT 
        e.id,
        e.prename,
        e.fname,
        e.lname,
        e.sex,
        e.birth,
        e.agey,
        e.position,
        e.branch_id,
        e.tel,
        e.num_star,
        e.is_active,
        e.image,
        e.nickname,
        COALESCE(e.employee_number, NULL) as employee_number,
        e.created_at,
        e.updated_at
      FROM employee e
      WHERE e.is_active = 'yes' OR e.is_active IS NULL
      ORDER BY CAST(IFNULL(e.employee_number, '999999') AS UNSIGNED) ASC, e.fname ASC, e.lname ASC
    `;

    // Get positions and branches for mapping
    const positions = await prisma.cPosition.findMany();
    const branches = await prisma.branch.findMany();

    // Create maps for quick lookup
    const positionMap = new Map(positions.map(p => [p.id, p.position]));
    const branchMap = new Map(branches.map(b => [b.id, b.name]));


    return NextResponse.json({
      staff: employees.map((e) => ({
        id: String(e.id),
        prename: e.prename || "",
        fname: e.fname || "",
        lname: e.lname || "",
        sex: e.sex,
        birth: e.birth ? e.birth.toISOString().split('T')[0] : null,
        agey: e.agey,
        position: e.position,
        position_name: e.position ? positionMap.get(e.position) || null : null,
        branch_id: e.branch_id,
        branch_name: e.branch_id ? branchMap.get(e.branch_id) || null : null,
        tel: e.tel,
        num_star: e.num_star,
        is_active: e.is_active,
        image: e.image,
        nickname: e.nickname || null,
        employee_number: e.employee_number || null,
        created_at: e.created_at ? e.created_at.toISOString() : null,
        updated_at: e.updated_at ? e.updated_at.toISOString() : null,
      })),
    });
  } catch (error) {
    console.error("Admin staff GET error", error);
    return NextResponse.json(
      { error: "Failed to load staff", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

// Create staff (using Employee model from ttm.sql)
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const prename = typeof body.prename === "string" ? body.prename.trim() : "นาง";
    const fname = typeof body.fname === "string" ? body.fname.trim() : "";
    const lname = typeof body.lname === "string" ? body.lname.trim() : "";
    const nickname = typeof body.nickname === "string" ? body.nickname.trim() : null;
    const sex = typeof body.sex === "string" ? body.sex : "หญิง";
    const birth = body.birth ? new Date(body.birth) : null;
    const agey = typeof body.agey === "number" ? body.agey : (typeof body.agey === "string" && body.agey ? parseInt(body.agey, 10) : null);
    const position = typeof body.position === "number" ? body.position : (typeof body.position === "string" && body.position ? parseInt(body.position, 10) : null);
    const branch_id = typeof body.branch_id === "number" ? body.branch_id : (typeof body.branch_id === "string" && body.branch_id ? parseInt(body.branch_id, 10) : null);
    const tel = typeof body.tel === "string" ? body.tel.trim() : null;
    const num_star = typeof body.num_star === "number" ? body.num_star : (typeof body.num_star === "string" && body.num_star ? parseInt(body.num_star, 10) : null);
    const is_active = typeof body.is_active === "string" ? body.is_active : "yes";
    const image = typeof body.image === "string" ? body.image.trim() : null;
    const employee_number = typeof body.employee_number === "string" ? body.employee_number.trim() : null;

    if (!fname) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อพนักงาน" },
        { status: 400 },
      );
    }

    // Use raw query to create employee with branch_id, image, employee_number, and nickname fields
    // Employee table may have branch_id, image, employee_number, and nickname fields that are not in Prisma schema
    await prisma.$executeRaw`
      INSERT INTO employee (
        prename, fname, lname, nickname, sex, birth, agey, position, branch_id, tel, num_star, is_active, image, employee_number, created_at, updated_at
      ) VALUES (
        ${prename}, ${fname}, ${lname}, ${nickname}, ${sex}, ${birth}, ${agey}, ${position}, ${branch_id}, ${tel}, ${num_star}, ${is_active}, ${image}, ${employee_number}, NOW(), NOW()
      )
    `;

    // Get the newly created employee ID
    const result = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT LAST_INSERT_ID() as id
    `;
    const newId = result[0]?.id;

    if (!newId) {
      throw new Error("Failed to get created employee ID");
    }

    // Get branches for mapping
    const branches = await prisma.branch.findMany();
    const branchMap = new Map(branches.map(b => [b.id, b.name]));

    return NextResponse.json(
      {
        id: String(newId),
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
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Admin staff POST error", error);
    return NextResponse.json(
      { 
        error: "Failed to create staff",
        details: error?.message || String(error)
      },
      { status: 500 },
    );
  }
}
