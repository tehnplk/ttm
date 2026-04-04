import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// List branches for public booking page
export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: "asc" },
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
          name: b.name,
          location: b.location,
          latitude: b.latitude,
          longitude: b.longitude,
          image: b.image || "/placeholder-branch.png",
          availableServices,
        };
      }),
    });
  } catch (error) {
    console.error("Branches GET error", error);
    return NextResponse.json(
      { error: "Failed to load branches", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

