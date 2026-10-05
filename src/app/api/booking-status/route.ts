import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isWithinBookingHours, BOOKING_HOURS_MESSAGE } from "@/lib/bookingHours";

// Get booking status (public API)
export async function GET() {
  if (!isWithinBookingHours()) {
    return NextResponse.json({ enabled: false, message: BOOKING_HOURS_MESSAGE });
  }

  try {
    // Use raw query to avoid Prisma Client regeneration issues
    // Try uppercase first, then lowercase (for Linux case-sensitive)
    let settings: Array<{
      booking_enabled: string | null;
      booking_message: string | null;
    }> = [];
    
    const tableNames = ['setting', 'Setting', 'SETTING'];
    let lastError: any = null;
    
    for (const tableName of tableNames) {
      try {
        // Use queryRawUnsafe for better compatibility with case-sensitive MySQL
        settings = await prisma.$queryRawUnsafe<Array<{
          booking_enabled: string | null;
          booking_message: string | null;
        }>>(`
          SELECT 
            booking_enabled,
            booking_message
          FROM \`${tableName}\`
          LIMIT 1
        `);
        
        // If we got here, the query succeeded
        break;
      } catch (tableError: any) {
        lastError = tableError;
        // Continue to next table name
        continue;
      }
    }

    // If all attempts failed
    if (!settings || settings.length === 0) {
      console.error('Failed to fetch booking status from all table name variations:', lastError);
      // On production (likely Ubuntu server), default to disabled for safety
      // This ensures that if the query fails, users won't be able to book
      const isProduction = process.env.NODE_ENV === 'production';
      return NextResponse.json({
        enabled: !isProduction, // Disabled on production if query fails
        message: isProduction ? "ไม่สามารถตรวจสอบสถานะการจองได้ กรุณาติดต่อเจ้าหน้าที่" : "",
      });
    }

    const setting = settings[0];
    const bookingEnabled = setting.booking_enabled || "yes";
    const bookingMessage = setting.booking_message || "";
    
    // Check if booking is enabled - 'yes' means enabled, anything else means disabled
    const isEnabled = bookingEnabled.toLowerCase() === "yes";

    console.log(`[Booking Status API] booking_enabled="${bookingEnabled}", isEnabled=${isEnabled}, message="${bookingMessage}"`);

    return NextResponse.json({
      enabled: isEnabled,
      message: bookingMessage,
    });
  } catch (error) {
    console.error("Booking status GET error", error);
    
    // If column doesn't exist, return enabled by default
    if (error instanceof Error && error.message?.includes('Unknown column')) {
      return NextResponse.json({
        enabled: true,
        message: "",
      });
    }
    
    // On any other error, return disabled for safety
    return NextResponse.json({
      enabled: false,
      message: "ไม่สามารถตรวจสอบสถานะการจองได้",
    });
  }
}
