import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// List positions (from cposition table)
export async function GET() {
  try {
    const positions = await prisma.$queryRaw<Array<{
      id: number;
      position: string;
    }>>`
      SELECT id, position
      FROM cposition
      ORDER BY id ASC
    `;

    return NextResponse.json({
      positions: positions.map((p) => ({
        id: p.id,
        position: p.position || "",
      })),
    });
  } catch (error) {
    console.error("Admin positions GET error", error);
    return NextResponse.json(
      { error: "Failed to load positions", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
