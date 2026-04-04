import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// List services for public booking page
export async function GET() {
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
      WHERE COALESCE(enabled, 'yes') = 'yes'
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
      })),
    });
  } catch (error) {
    console.error("Services GET error", error);
    return NextResponse.json(
      { error: "Failed to load services", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

