import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

// Update broadcast setting
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const { id } = await params;
    const broadcastId = parseInt(id);
    if (isNaN(broadcastId)) {
      return NextResponse.json(
        { error: "Invalid broadcast ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const broadcastDate = typeof body.broadcastDate === "string" ? body.broadcastDate.trim() : null;
    const broadcastTime = typeof body.broadcastTime === "string" ? body.broadcastTime.trim() : null;
    const message = typeof body.message === "string" ? body.message.trim() : null;
    const branchIds = Array.isArray(body.branchIds) ? body.branchIds : null;
    const enabled = typeof body.enabled === "string" ? body.enabled : null;

    // Build update data object
    const updateData: any = {};

    if (broadcastDate !== null) {
      updateData.broadcastDate = new Date(broadcastDate);
    }

    if (broadcastTime !== null) {
      // Validate time format
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(broadcastTime)) {
        return NextResponse.json(
          { error: "รูปแบบเวลาไม่ถูกต้อง ต้องเป็น HH:mm (เช่น 09:00)" },
          { status: 400 },
        );
      }
      updateData.broadcastTime = broadcastTime;
    }

    if (message !== null) {
      updateData.message = message;
    }

    if (branchIds !== null) {
      if (branchIds.length === 0) {
        return NextResponse.json(
          { error: "กรุณาเลือกสาขาอย่างน้อย 1 สาขา" },
          { status: 400 },
        );
      }
      updateData.branchIds = JSON.stringify(branchIds);
    }

    if (enabled !== null) {
      updateData.enabled = enabled;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "ไม่มีข้อมูลที่จะอัปเดต" },
        { status: 400 },
      );
    }

    // Update using raw SQL to handle branchIds field that may not exist yet
    try {
      // Build update query with branchIds
      let updateQuery = 'UPDATE broadcast_settings SET ';
      const setParts: string[] = [];

      if (updateData.broadcastDate) {
        setParts.push('broadcast_date = ?');
      }
      if (updateData.broadcastTime) {
        setParts.push('broadcast_time = ?');
      }
      if (updateData.message) {
        setParts.push('message = ?');
      }
      if (updateData.branchIds !== undefined) {
        setParts.push('branch_ids = ?');
      }
      if (updateData.enabled) {
        setParts.push('enabled = ?');
      }
      setParts.push('updated_at = NOW()');

      updateQuery += setParts.join(', ') + ' WHERE id = ?';

      const values: any[] = [];
      if (updateData.broadcastDate) values.push(updateData.broadcastDate);
      if (updateData.broadcastTime) values.push(updateData.broadcastTime);
      if (updateData.message) values.push(updateData.message);
      if (updateData.branchIds !== undefined) values.push(updateData.branchIds);
      if (updateData.enabled) values.push(updateData.enabled);
      values.push(broadcastId);

      await prisma.$executeRawUnsafe(updateQuery, ...values);
    } catch (updateError: any) {
      // If branchIds column doesn't exist, update without it
      if (updateError.message?.includes('branch_ids') || updateError.message?.includes('Unknown column')) {
        const { branchIds: _, ...updateDataWithoutBranchIds } = updateData;
        if (Object.keys(updateDataWithoutBranchIds).length > 0) {
          let updateQuery = 'UPDATE broadcast_settings SET ';
          const setParts: string[] = [];

          if (updateDataWithoutBranchIds.broadcastDate) {
            setParts.push('broadcast_date = ?');
          }
          if (updateDataWithoutBranchIds.broadcastTime) {
            setParts.push('broadcast_time = ?');
          }
          if (updateDataWithoutBranchIds.message) {
            setParts.push('message = ?');
          }
          if (updateDataWithoutBranchIds.enabled) {
            setParts.push('enabled = ?');
          }
          setParts.push('updated_at = NOW()');

          updateQuery += setParts.join(', ') + ' WHERE id = ?';

          const values: any[] = [];
          if (updateDataWithoutBranchIds.broadcastDate) values.push(updateDataWithoutBranchIds.broadcastDate);
          if (updateDataWithoutBranchIds.broadcastTime) values.push(updateDataWithoutBranchIds.broadcastTime);
          if (updateDataWithoutBranchIds.message) values.push(updateDataWithoutBranchIds.message);
          if (updateDataWithoutBranchIds.enabled) values.push(updateDataWithoutBranchIds.enabled);
          values.push(broadcastId);

          await prisma.$executeRawUnsafe(updateQuery, ...values);
        }
      } else {
        throw updateError;
      }
    }

    return NextResponse.json({
      success: true,
      id: broadcastId,
    });
  } catch (error) {
    console.error("Update broadcast setting error", error);
    return NextResponse.json(
      {
        error: "Failed to update broadcast setting",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// Delete broadcast setting
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const { id } = await params;
    const broadcastId = parseInt(id);
    if (isNaN(broadcastId)) {
      return NextResponse.json(
        { error: "Invalid broadcast ID" },
        { status: 400 },
      );
    }

    await prisma.$executeRaw`
      DELETE FROM broadcast_settings WHERE id = ${broadcastId}
    `;

    return NextResponse.json({
      success: true,
      id: broadcastId,
    });
  } catch (error) {
    console.error("Delete broadcast setting error", error);
    return NextResponse.json(
      {
        error: "Failed to delete broadcast setting",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

