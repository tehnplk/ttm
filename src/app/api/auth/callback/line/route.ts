import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

const LINE_CLIENT_ID = process.env.LINE_CLIENT_ID;
const LINE_CLIENT_SECRET = process.env.LINE_CLIENT_SECRET;

// LINE OAuth Callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
    }

    if (!LINE_CLIENT_ID || !LINE_CLIENT_SECRET) {
      return NextResponse.redirect(new URL("/login?error=line_not_configured", request.url));
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_BOOKING_URL || request.url.split('/api')[0]}/api/auth/callback/line`,
        client_id: LINE_CLIENT_ID,
        client_secret: LINE_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("LINE token error:", errorText);
      return NextResponse.redirect(new URL("/login?error=token_exchange_failed", request.url));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user profile from LINE
    const profileResponse = await fetch("https://api.line.me/v2/profile", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      return NextResponse.redirect(new URL("/login?error=profile_fetch_failed", request.url));
    }

    const profile = await profileResponse.json();
    const providerId = profile.userId;
    const name = profile.displayName || providerId;
    const picture = profile.pictureUrl || null;

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
        AND provider_type = 'line'
    `;

    if (adminUser.length === 0) {
      // Create new admin user
      await prisma.$executeRaw`
        INSERT INTO admin_users (provider_id, provider_type, name, email, role, is_active)
        VALUES (${providerId}, 'line', ${name}, NULL, 'admin', 'yes')
      `;

      // Get the inserted ID
      const insertResult = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT LAST_INSERT_ID() as id
      `;
      const insertId = insertResult[0]?.id || 1;

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

    if (!user || user.is_active !== "yes") {
      return NextResponse.redirect(new URL("/login?error=account_disabled", request.url));
    }

    // Update last login
    await prisma.$executeRaw`
      UPDATE admin_users
      SET last_login = NOW(), updated_at = NOW()
      WHERE id = ${user.id}
    `;

    // Generate session token
    const token = crypto.randomBytes(32).toString('hex');

    // Redirect to admin with token
    const redirectUrl = new URL("/admin", request.url);
    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set("user", JSON.stringify({
      id: user.id,
      providerId: user.provider_id,
      name: user.name,
      role: user.role,
    }));

    const response = NextResponse.redirect(redirectUrl);

    // Set HTTP-only cookie
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("LINE callback error", error);
    return NextResponse.redirect(new URL("/login?error=callback_failed", request.url));
  }
}





