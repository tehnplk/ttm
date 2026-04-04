import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

// List branches from Branch table
export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      branches: branches.map((b) => {
        // Parse availableServices from JSON string to array
        let availableServices: string[] = [];
        try {
          availableServices = JSON.parse(b.availableServices || "[]");
        } catch {
          availableServices = [];
        }

        return {
          id: String(b.id),
          code: b.code,
          name: b.name,
          location: b.location,
          latitude: b.latitude,
          longitude: b.longitude,
          image: b.image,
          availableServices,
          is_active: b.is_active,
        };
      }),
    });
  } catch (error) {
    console.error("Admin branches GET error", error);
    return NextResponse.json(
      { error: "Failed to load branches", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

// Create branch
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const location = typeof body.location === "string" ? body.location.trim() : "";
    const latitude = typeof body.latitude === "number" ? body.latitude : typeof body.latitude === "string" ? parseFloat(body.latitude) : null;
    const longitude = typeof body.longitude === "number" ? body.longitude : typeof body.longitude === "string" ? parseFloat(body.longitude) : null;
    const image = typeof body.image === "string" ? body.image.trim() : "";
    const availableServices =
      typeof body.availableServices === "string" ? body.availableServices.trim() : "";
    const is_active = typeof body.is_active === "string" ? body.is_active : "yes";

    if (!code || !name || !location) {
      return NextResponse.json(
        { error: "กรุณากรอกรหัสสาขา ชื่อและที่อยู่สาขา" },
        { status: 400 },
      );
    }

    // Check for duplicate code
    const existingBranch = await prisma.branch.findUnique({
      where: { code },
    });

    if (existingBranch) {
      return NextResponse.json(
        { error: `รหัสสาขา "${code}" มีอยู่แล้วในระบบ กรุณาใช้รหัสอื่น` },
        { status: 409 }, // Conflict
      );
    }

    const created = await prisma.branch.create({
      data: {
        code,
        name,
        location,
        latitude: latitude && !isNaN(latitude) ? latitude : null,
        longitude: longitude && !isNaN(longitude) ? longitude : null,
        image: image || "/placeholder-branch.png",
        availableServices: availableServices || "[]",
        is_active,
      },
    });

    return NextResponse.json(
      {
        id: String(created.id),
        code: created.code,
        name: created.name,
        location: created.location,
        latitude: created.latitude,
        longitude: created.longitude,
        image: created.image,
        availableServices: created.availableServices,
        is_active: created.is_active,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Admin branches POST error", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    
    // Check if it's a unique constraint error
    if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
      return NextResponse.json(
        { error: "รหัสสาขามีอยู่แล้วในระบบ กรุณาใช้รหัสอื่น" },
        { status: 409 },
      );
    }
    
    return NextResponse.json(
      { 
        error: "บันทึกข้อมูลสาขาไม่สำเร็จ",
        details: error?.message || String(error)
      },
      { status: 500 },
    );
  }
}

