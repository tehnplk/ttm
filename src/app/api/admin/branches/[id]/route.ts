import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Update branch
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const branchId = parseInt(id);
    if (isNaN(branchId)) {
      return NextResponse.json(
        { error: "Invalid branch ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    
    // If only is_active is provided, update only that field
    if (body.is_active !== undefined && Object.keys(body).length === 1) {
      const is_active = typeof body.is_active === "string" ? body.is_active : "yes";
      await prisma.branch.update({
        where: { id: branchId },
        data: { is_active },
      });
      return NextResponse.json({ success: true, is_active });
    }

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

    // Check for duplicate code (excluding current branch)
    const existingBranch = await prisma.branch.findFirst({
      where: {
        code,
        id: { not: branchId },
      },
    });

    if (existingBranch) {
      return NextResponse.json(
        { error: `รหัสสาขา "${code}" มีอยู่แล้วในระบบ กรุณาใช้รหัสอื่น` },
        { status: 409 },
      );
    }

    const updated = await prisma.branch.update({
      where: { id: branchId },
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

    return NextResponse.json({
      id: String(updated.id),
      code: updated.code,
      name: updated.name,
      location: updated.location,
      latitude: updated.latitude,
      longitude: updated.longitude,
      image: updated.image,
      availableServices: updated.availableServices,
      is_active: updated.is_active,
    });
  } catch (error) {
    console.error("Admin branches PUT error", error);
    return NextResponse.json(
      { error: "Failed to update branch", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

// Delete branch
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const branchId = parseInt(id);
    if (isNaN(branchId)) {
      return NextResponse.json(
        { error: "Invalid branch ID" },
        { status: 400 },
      );
    }

    await prisma.branch.delete({
      where: { id: branchId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin branches DELETE error", error);
    return NextResponse.json(
      { error: "Failed to delete branch", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

