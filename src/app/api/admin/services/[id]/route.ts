import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Update service
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const duration = typeof body.duration === "number" ? body.duration : typeof body.duration === "string" ? parseInt(body.duration, 10) : 0;
    const price = typeof body.price === "number" ? body.price : typeof body.price === "string" ? parseFloat(body.price) : 0;
    const image = typeof body.image === "string" ? body.image.trim() : "";
    const enabled = typeof body.enabled === "string" ? body.enabled : "yes";

    if (!name || duration <= 0 || price <= 0) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อบริการ ระยะเวลาและราคา" },
        { status: 400 },
      );
    }

    const serviceId = parseInt(id, 10);
    if (isNaN(serviceId)) {
      return NextResponse.json(
        { error: "Invalid service ID" },
        { status: 400 },
      );
    }

    // Update service using Prisma model
    const updated = await prisma.service.update({
      where: { id: serviceId },
      data: {
        name,
        description: description || "",
        duration,
        price,
        image: image || "/placeholder-service.png",
        enabled,
      },
    });

    return NextResponse.json({
      id: updated.id.toString(),
      name: updated.name,
      description: updated.description,
      duration: updated.duration,
      price: Number(updated.price),
      image: updated.image,
      enabled: updated.enabled || "yes",
    });
  } catch (error) {
    console.error("Admin services PUT error", error);
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 },
    );
  }
}

// Delete service
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const serviceId = parseInt(id, 10);
    if (isNaN(serviceId)) {
      return NextResponse.json(
        { error: "Invalid service ID" },
        { status: 400 },
      );
    }

    await prisma.service.delete({
      where: { id: serviceId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin services DELETE error", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 },
    );
  }
}

