import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

// List services
export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    // Use raw query to handle enabled field that might be null in database
    const services = await prisma.$queryRaw<Array<{
      id: number;
      name: string;
      description: string;
      duration: number;
      price: number;
      image: string;
      enabled: string | null;
    }>>`
      SELECT 
        id,
        name,
        description,
        duration,
        price,
        image,
        COALESCE(enabled, 'yes') as enabled
      FROM Service
      ORDER BY name ASC
    `;

    return NextResponse.json({
      services: services.map((s) => ({
        id: s.id.toString(),
        name: s.name,
        description: s.description || "",
        duration: s.duration,
        price: Number(s.price),
        image: s.image || "/placeholder-service.png",
        enabled: s.enabled || "yes",
      })),
    });
  } catch (error) {
    console.error("Admin services GET error", error);
    return NextResponse.json(
      { error: "Failed to load services", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

// Create service
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const duration = typeof body.duration === "number" ? body.duration : typeof body.duration === "string" ? parseInt(body.duration, 10) : 60;
    const price = typeof body.price === "number" ? body.price : typeof body.price === "string" ? parseFloat(body.price) : 0;
    const image = typeof body.image === "string" ? body.image.trim() : "";
    const enabled = typeof body.enabled === "string" ? body.enabled : "yes";

    if (!name || duration <= 0 || price <= 0) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อบริการ ระยะเวลาและราคา" },
        { status: 400 },
      );
    }

    const created = await prisma.service.create({
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
      id: created.id.toString(),
      name: created.name,
      description: created.description,
      duration: created.duration,
      price: Number(created.price),
      image: created.image,
      enabled: created.enabled || "yes",
    });
  } catch (error: any) {
    console.error("Admin services POST error", error);
    return NextResponse.json(
      { 
        error: "Failed to create service",
        details: error?.message || String(error)
      },
      { status: 500 },
    );
  }
}

