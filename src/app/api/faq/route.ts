import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch FAQs from database using raw query
    const faqs = await prisma.$queryRaw<Array<{
      id: number;
      question: string;
      answer: string;
    }>>`
      SELECT id, question, answer
      FROM faq
      WHERE is_active = 'yes'
      ORDER BY id ASC
    `;

    console.log(`Fetched ${faqs.length} FAQs from database`);

    return NextResponse.json({
      faqs: faqs,
    });
  } catch (error: any) {
    console.error('Error fetching FAQs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FAQs', details: error.message },
      { status: 500 }
    );
  }
}

