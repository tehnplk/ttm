import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

// PUT - Update FAQ
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const { question, answer, order, is_active } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: "กรุณากรอกคำถามและคำตอบ" },
        { status: 400 },
      );
    }

    await prisma.$executeRaw`
      UPDATE faq
      SET 
        question = ${question},
        answer = ${answer},
        \`order\` = ${order ?? 0},
        is_active = ${is_active || 'yes'},
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
    `;

    // Get updated FAQ
    const updatedFaq = await prisma.$queryRaw<Array<{
      id: number;
      question: string;
      answer: string;
      order: number;
      is_active: string | null;
    }>>`
      SELECT id, question, answer, \`order\`, is_active
      FROM faq
      WHERE id = ${parseInt(id)}
    `;

    return NextResponse.json({ faq: updatedFaq[0] });
  } catch (error) {
    console.error("❌ Error updating FAQ:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปเดต FAQ" },
      { status: 500 },
    );
  }
}

// DELETE - Delete FAQ (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    await prisma.$executeRaw`
      UPDATE faq
      SET is_active = 'no', updated_at = NOW()
      WHERE id = ${parseInt(id)}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting FAQ:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการลบ FAQ" },
      { status: 500 },
    );
  }
}


