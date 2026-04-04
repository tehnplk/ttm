import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

// Get notification settings
export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const setting = await prisma.notificationSettings.findFirst({
      orderBy: { id: 'desc' },
    });

    if (!setting) {
      // Return default settings if none exist
      return NextResponse.json({
        id: null,
        enabled: "yes",
        notificationTime: "09:00",
        messageTemplate: "สวัสดีครับ คุณ{name} มีนัดในวันพรุ่งนี้ (วันที่ {date}) เวลา {time} ที่ {branch} กรุณามาตามเวลานัดหมาย",
        daysBefore: 1,
      });
    }

    return NextResponse.json({
      id: setting.id,
      enabled: setting.enabled,
      notificationTime: setting.notificationTime,
      messageTemplate: setting.messageTemplate || "สวัสดีครับ คุณ{name} มีนัดในวันพรุ่งนี้ (วันที่ {date}) เวลา {time} ที่ {branch} กรุณามาตามเวลานัดหมาย",
      daysBefore: setting.daysBefore,
    });
  } catch (error) {
    console.error("Get notification settings error", error);
    return NextResponse.json(
      {
        error: "Failed to load notification settings",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// Update notification settings
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const enabled = typeof body.enabled === "string" ? body.enabled : "yes";
    const notificationTime = typeof body.notificationTime === "string" ? body.notificationTime.trim() : "09:00";
    const messageTemplate = typeof body.messageTemplate === "string" ? body.messageTemplate.trim() : null;
    const daysBefore = typeof body.daysBefore === "number" ? body.daysBefore : 1;

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(notificationTime)) {
      return NextResponse.json(
        { error: "รูปแบบเวลาไม่ถูกต้อง ต้องเป็น HH:mm (เช่น 09:00)" },
        { status: 400 },
      );
    }

    // Check if settings exist
    const existing = await prisma.notificationSettings.findFirst({
      orderBy: { id: 'desc' },
    });

    let result;
    if (existing) {
      // Update existing settings
      result = await prisma.notificationSettings.update({
        where: { id: existing.id },
        data: {
          enabled,
          notificationTime,
          messageTemplate,
          daysBefore,
        },
      });
    } else {
      // Create new settings
      result = await prisma.notificationSettings.create({
        data: {
          enabled,
          notificationTime,
          messageTemplate,
          daysBefore,
        },
      });
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      enabled: result.enabled,
      notificationTime: result.notificationTime,
      messageTemplate: result.messageTemplate,
      daysBefore: result.daysBefore,
    });
  } catch (error) {
    console.error("Update notification settings error", error);
    return NextResponse.json(
      {
        error: "Failed to update notification settings",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

