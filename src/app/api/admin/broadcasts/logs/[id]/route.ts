import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

// Delete a broadcast log (its recipients are removed by the FK cascade)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const { id } = await params;
    const logId = parseInt(id);
    if (isNaN(logId)) {
      return NextResponse.json(
        { error: "Invalid log ID" },
        { status: 400 },
      );
    }

    await prisma.$executeRaw`
      DELETE FROM broadcast_send_log WHERE id = ${logId}
    `;

    return NextResponse.json({
      success: true,
      id: logId,
    });
  } catch (error) {
    console.error("Delete broadcast log error", error);
    return NextResponse.json(
      {
        error: "Failed to delete broadcast log",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
