import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// Login with provider ID
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const providerType = typeof body.providerType === "string" ? body.providerType.trim() : "line";
    const providerId = typeof body.providerId === "string" ? body.providerId.trim() : "";

    if (!providerId) {
      return NextResponse.json(
        { error: "กรุณากรอก Provider ID" },
        { status: 400 },
      );
    }

    // Find or create admin user
    let adminUser = await prisma.$queryRaw<Array<{
      id: number;
      provider_id: string;
      provider_type: string;
      name: string;
      email: string | null;
      role: string;
      is_active: string;
    }>>`
      SELECT * FROM admin_users
      WHERE provider_id = ${providerId}
        AND provider_type = ${providerType}
    `;

    if (adminUser.length === 0) {
      // Create new admin user
      await prisma.$executeRaw`
        INSERT INTO admin_users (provider_id, provider_type, name, email, role, is_active)
        VALUES (${providerId}, ${providerType}, ${providerId}, NULL, 'admin', 'yes')
      `;

      // Get the inserted ID
      const insertResult = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT LAST_INSERT_ID() as id
      `;
      const insertId = insertResult[0]?.id || 1;

      // Get created user
      adminUser = await prisma.$queryRaw<Array<{
        id: number;
        provider_id: string;
        provider_type: string;
        name: string;
        email: string | null;
        role: string;
        is_active: string;
      }>>`
        SELECT * FROM admin_users
        WHERE id = ${insertId}
      `;
    }

    const user = adminUser[0];

    if (!user) {
      return NextResponse.json(
        { error: "ไม่พบผู้ใช้" },
        { status: 404 },
      );
    }

    if (user.is_active !== "yes") {
      return NextResponse.json(
        { error: "บัญชีนี้ถูกปิดการใช้งาน" },
        { status: 403 },
      );
    }

    // Update last login
    await prisma.$executeRaw`
      UPDATE admin_users
      SET last_login = NOW(), updated_at = NOW()
      WHERE id = ${user.id}
    `;

    // Generate session token
    const token = crypto.randomBytes(32).toString('hex');

    // Store token in response (client will store in localStorage)
    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        providerId: user.provider_id,
        providerType: user.provider_type,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Set HTTP-only cookie for additional security
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error", error);
    return NextResponse.json(
      {
        error: "เกิดข้อผิดพลาดในการล็อกอิน",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}





