import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authResponse = await requireApiAuth(request);
    if (authResponse) return authResponse;

    // Handle both Promise and direct params (Next.js 15+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, role } = body;

    if (!status || !["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'pending', 'approved', or 'rejected'" },
        { status: 400 }
      );
    }

    // Build update query
    const updates: string[] = [];
    const queryParams: any[] = [];

    updates.push("status = ?");
    queryParams.push(status);

    if (role && ["admin", "manager", "staff"].includes(role)) {
      updates.push("role = ?");
      queryParams.push(role);
    }

    updates.push("updated_at = NOW()");
    queryParams.push(id);

    const query = `
      UPDATE admin_users
      SET ${updates.join(", ")}
      WHERE id = ?
    `;

    await prisma.$executeRawUnsafe(query, ...queryParams);

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user", details: error?.message },
      { status: 500 }
    );
  }
}

