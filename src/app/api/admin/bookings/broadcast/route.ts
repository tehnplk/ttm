import { NextRequest, NextResponse } from 'next/server';
import { broadcastBookingEvent } from '../events/route';

// This endpoint is called when a new booking is created
// It broadcasts the event to all connected SSE clients
// Note: This endpoint is called internally from the server, so no auth required
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Broadcast the booking event
    broadcastBookingEvent('booking_created', {
      bookingId: body.bookingId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true,
      message: 'Event broadcasted successfully'
    });
  } catch (error: any) {
    console.error('Error broadcasting booking event:', error);
    return NextResponse.json(
      { error: 'Failed to broadcast event', message: error.message },
      { status: 500 }
    );
  }
}

