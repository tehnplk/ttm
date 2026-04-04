import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userid');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch bookings for this LINE user ID
    const bookings = await prisma.$queryRaw<Array<{
      id: number;
      booking_id: string | null;
      branch_name: string | null;
      service_name: string | null;
      staff_name: string | null;
      booker_name: string;
      book_date: Date;
      book_time: string | null;
      status: string | null;
      confirm_datetime: Date | null;
      note5: string | null;
    }>>`
      SELECT 
        b.id,
        b.booking_id,
        br.name as branch_name,
        sv.name as service_name,
        CONCAT(COALESCE(e.prename, ''), COALESCE(e.fname, ''), ' ', COALESCE(e.lname, '')) as staff_name,
        b.booker_name,
        b.book_date,
        b.book_time,
        b.status,
        b.confirm_datetime,
        b.note5
      FROM booking b
      LEFT JOIN \`Branch\` br ON b.branch_id = br.id
      LEFT JOIN \`Service\` sv ON b.service_id = sv.id
      LEFT JOIN employee e ON b.emp_id = e.id
      WHERE b.line_id = ${userId}
      ORDER BY b.book_date DESC, b.book_time DESC
    `;

    // Format bookings for response
    const formattedBookings = bookings.map(b => ({
      id: b.id,
      bookingId: b.booking_id || `BK-${String(b.id).padStart(6, '0')}`,
      branchName: b.branch_name || '-',
      serviceName: b.service_name || '-',
      staffName: b.staff_name?.trim() || '-',
      customerName: b.booker_name || '-',
      date: b.book_date.toISOString(),
      time: b.book_time || '-',
      status: b.status || 'pending',
      confirmDatetime: b.confirm_datetime?.toISOString() || null,
      createdAt: b.note5 || null,
    }));

    return NextResponse.json({
      bookings: formattedBookings,
      total: formattedBookings.length,
    });
  } catch (error: any) {
    console.error('Error fetching booking history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking history', details: error.message },
      { status: 500 }
    );
  }
}

