import { NextResponse } from "next/server";
import { listBookings } from "@/lib/backoffice/booking-service";

export async function GET() {
  try {
    const bookings = await listBookings();
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Backoffice bookings GET error", error);
    return NextResponse.json(
      { error: "Failed to load bookings" },
      { status: 500 }
    );
  }
}
