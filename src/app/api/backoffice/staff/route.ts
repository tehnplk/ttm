import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// List staff (using Employee model)
export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      where: {
        is_active: 'yes',
      },
      orderBy: [
        { fname: 'asc' },
        { lname: 'asc' },
      ],
    });

    return NextResponse.json({
      staff: employees.map((e) => ({
        id: String(e.id),
        name: `${e.prename || ''}${e.fname || ''} ${e.lname || ''}`.trim() || 'ไม่ระบุชื่อ',
        role: e.position?.toString() || "",
        image: "/placeholder-staff.png", // Employee model doesn't have image field
        specialty: [],
      })),
    });
  } catch (error) {
    console.error("Backoffice staff GET error", error);
    return NextResponse.json(
      { error: "Failed to load staff" },
      { status: 500 },
    );
  }
}

// Create staff (using Employee model)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const image = typeof body.image === "string" ? body.image.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อพนักงาน" },
        { status: 400 },
      );
    }

    // Parse name into prename, fname, lname
    // Simple parsing: assume first word is prename, rest is fname and lname
    const nameParts = name.split(/\s+/);
    const prename = nameParts[0] || "";
    const fname = nameParts.slice(1, -1).join(" ") || nameParts[1] || "";
    const lname = nameParts[nameParts.length - 1] || "";

    // Create employee using Prisma model
    const created = await prisma.employee.create({
      data: {
        prename,
        fname,
        lname,
        position: role ? parseInt(role) : null,
        is_active: 'yes',
      },
    });

    return NextResponse.json(
      {
        id: String(created.id),
        name,
        role: role || "",
        image: image || "/placeholder-staff.png",
        specialty: [],
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Backoffice staff POST error", error);
    return NextResponse.json(
      { error: "Failed to create staff" },
      { status: 500 },
    );
  }
}



