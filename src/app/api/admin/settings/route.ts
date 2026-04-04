import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";


// Get settings (only one record)
export async function GET() {
  try {
    // Use raw query to avoid Prisma Client regeneration issues
    const settings = await prisma.$queryRaw<Array<{
      id: string;
      booking_enabled: string | null;
      booking_message: string | null;
    }>>`
      SELECT 
        id,
        booking_enabled,
        booking_message
      FROM \`setting\`
      LIMIT 1
    `;

    if (!settings || settings.length === 0) {
      // Return default values if no settings exist
      return NextResponse.json({
        id: "",
        bookingEnabled: "yes",
        bookingMessage: "",
      });
    }

    const setting = settings[0];
    return NextResponse.json({
      id: setting.id,
      bookingEnabled: setting.booking_enabled || "yes",
      bookingMessage: setting.booking_message || "",
    });
  } catch (error) {
    console.error("Admin settings GET error", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 },
    );
  }
}

// Create or update settings
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bookingEnabled = typeof body.bookingEnabled === "string" ? body.bookingEnabled.trim() : "yes";
    const bookingMessage = typeof body.bookingMessage === "string" ? body.bookingMessage.trim() : "";

    // Check if settings exist using raw query
    const existing = await prisma.$queryRaw<Array<{ 
      id: string; 
      booking_enabled: string | null;
    }>>`
      SELECT id, booking_enabled FROM \`setting\` LIMIT 1
    `;

    if (existing && existing.length > 0) {
      // Update only booking settings using raw query
      await prisma.$executeRaw`
        UPDATE \`setting\` 
        SET 
          booking_enabled = ${bookingEnabled},
          booking_message = ${bookingMessage || null}
        WHERE id = ${existing[0].id}
      `;

      return NextResponse.json({
        id: existing[0].id,
        bookingEnabled: bookingEnabled,
        bookingMessage: bookingMessage,
      });
    } else {
      // Create with default values for other fields using raw query
      const id = 'default-config';
      
      // Try to insert, if booking_enabled column doesn't exist, it will fail gracefully
      try {
        await prisma.$executeRaw`
          INSERT INTO \`setting\` (id, openTime, closeTime, holidays, slotInterval, booking_enabled, booking_message)
          VALUES (${id}, 9, 18, '[]', 30, ${bookingEnabled}, ${bookingMessage || null})
        `;
      } catch (insertError: any) {
        // If columns don't exist, create without them
        if (insertError.message?.includes('booking_enabled') || insertError.message?.includes("Unknown column")) {
          await prisma.$executeRaw`
            INSERT INTO \`setting\` (id, openTime, closeTime, holidays, slotInterval)
            VALUES (${id}, 9, 18, '[]', 30)
          `;
          
          // Try to add columns if they don't exist (this might fail if user doesn't have ALTER permission)
          try {
            await prisma.$executeRaw`
              ALTER TABLE \`setting\` 
              ADD COLUMN booking_enabled VARCHAR(255) DEFAULT 'yes' AFTER slotInterval
            `;
            await prisma.$executeRaw`
              ALTER TABLE \`setting\` 
              ADD COLUMN booking_message TEXT NULL AFTER booking_enabled
            `;
            
            // Update again with booking settings
            await prisma.$executeRaw`
              UPDATE \`setting\` 
              SET 
                booking_enabled = ${bookingEnabled},
                booking_message = ${bookingMessage || null}
              WHERE id = ${id}
            `;
          } catch (alterError) {
            console.warn('Could not add booking columns automatically:', alterError);
          }
        } else {
          throw insertError;
        }
      }

      return NextResponse.json({
        id: id,
        bookingEnabled: bookingEnabled,
        bookingMessage: bookingMessage,
    });
    }
  } catch (error: any) {
    console.error("Admin settings POST error", error);
    return NextResponse.json(
      { 
        error: "Failed to save settings",
        details: error?.message || String(error)
      },
      { status: 500 },
    );
  }
}


