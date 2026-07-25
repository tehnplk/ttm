import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";
import {
  fetchNotifiableBookings,
  formatBookingDate,
  formatBookingTime,
  isValidLineId,
  maskLineId,
  resolveTargetDate,
} from "@/lib/notification-targets";

/**
 * Candidate recipients for the current notification settings.
 * Used by the admin test-send modal to pick a single person before sending.
 */
export async function GET(request: NextRequest) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    const setting = await prisma.notificationSettings.findFirst({
      orderBy: { id: "desc" },
    });

    // Allow the UI to preview with the value currently in the form,
    // before it has been saved
    const daysBeforeParam = request.nextUrl.searchParams.get("daysBefore");
    const parsed = daysBeforeParam ? parseInt(daysBeforeParam, 10) : NaN;
    const daysBefore = Number.isFinite(parsed) && parsed > 0
      ? parsed
      : setting?.daysBefore || 1;

    const targetDate = resolveTargetDate(daysBefore);
    const bookings = await fetchNotifiableBookings({ daysBefore });

    return NextResponse.json({
      daysBefore,
      enabled: setting?.enabled ?? "yes",
      targetDate: formatBookingDate(targetDate),
      recipients: bookings.map((booking) => ({
        id: booking.id,
        bookingCode: booking.booking_id,
        bookerName: booking.booker_name,
        bookerTel: booking.booker_tel,
        dateLabel: formatBookingDate(booking.book_date),
        timeLabel: formatBookingTime(booking.book_time),
        branchName: booking.branch_name,
        serviceName: booking.service_name,
        status: booking.status,
        lineId: maskLineId(booking.line_id),
        lineIdValid: isValidLineId(booking.line_id),
      })),
    });
  } catch (error) {
    console.error("Get notification recipients error", error);
    return NextResponse.json(
      {
        error: "Failed to load notification recipients",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
