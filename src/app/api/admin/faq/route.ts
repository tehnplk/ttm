import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

// GET - List all FAQs (for admin, show only active ones)
export async function GET(request: NextRequest) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    const faqs = await prisma.$queryRaw<Array<{
      id: number;
      question: string;
      answer: string;
      order: number;
      is_active: string | null;
      created_at: Date | null;
      updated_at: Date | null;
    }>>`
      SELECT 
        id,
        question,
        answer,
        \`order\`,
        is_active,
        created_at,
        updated_at
      FROM faq
      WHERE is_active = 'yes' OR is_active IS NULL
      ORDER BY \`order\` ASC, id ASC
    `;

    return NextResponse.json({ faqs });
  } catch (error) {
    console.error("❌ Error fetching FAQs:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล FAQ" },
      { status: 500 },
    );
  }
}

// POST - Create new FAQ
export async function POST(request: NextRequest) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { question, answer, order } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: "กรุณากรอกคำถามและคำตอบ" },
        { status: 400 },
      );
    }

    const result = await prisma.$executeRaw`
      INSERT INTO faq (question, answer, \`order\`, is_active, created_at, updated_at)
      VALUES (${question}, ${answer}, ${order || 0}, 'yes', NOW(), NOW())
    `;

    // Get the newly created FAQ
    const newFaq = await prisma.$queryRaw<Array<{
      id: number;
      question: string;
      answer: string;
      order: number;
      is_active: string | null;
    }>>`
      SELECT id, question, answer, \`order\`, is_active
      FROM faq
      WHERE id = LAST_INSERT_ID()
    `;

    return NextResponse.json({ faq: newFaq[0] }, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating FAQ:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสร้าง FAQ" },
      { status: 500 },
    );
  }
}

