import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/authConfig";
import prisma from "@/lib/prisma";

// Helper function to get redirect URL base
function getBaseUrl(requestUrl: string): string {
  // Use NEXT_PUBLIC_BOOKING_URL if set, otherwise extract from request URL
  const envUrl = process.env.NEXT_PUBLIC_BOOKING_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  // Extract base URL from request (fallback)
  try {
    const url = new URL(requestUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return requestUrl.split('/api')[0];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const landing = searchParams.get("landing");
  const is_auth = searchParams.get("is_auth") === "yes";
  
  // Get base URL for redirects
  const baseUrl = getBaseUrl(request.url);
  const landingPath = landing || "/admin";
  const redirectTo = `${baseUrl}${landingPath}`;

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent("Authorization code is missing")}`);
  }

  try {
    // 1. Get Health ID Token
    const response = await fetch("https://moph.id.th/api/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.HEALTH_REDIRECT_URI,
        client_id: process.env.HEALTH_CLIENT_ID,
        client_secret: process.env.HEALTH_CLIENT_SECRET,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Health ID token error:", data);
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent("Failed to fetch Health ID token")}`);
    }

    // 2. Get Provider ID Token
    const userResponse = await fetch(
      "https://provider.id.th/api/v1/services/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.PROVIDER_CLIENT_ID,
          secret_key: process.env.PROVIDER_CLIENT_SECRET,
          token_by: "Health ID",
          token: data.data.access_token,
        }),
      }
    );

    const userData = await userResponse.json();
    if (!userResponse.ok) {
      console.error("Provider ID token error:", userData);
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent("Failed to fetch provider data")}`);
    }

    // 3. Get User Profile
    const profileResponse = await fetch(
      "https://provider.id.th/api/v1/services/profile?position_type=1",
      {
        method: "GET",
        headers: {
          "client-id": process.env.PROVIDER_CLIENT_ID!,
          "secret-key": process.env.PROVIDER_CLIENT_SECRET!,
          Authorization: `Bearer ${userData.data.access_token}`,
        },
      }
    );

    const profileData = await profileResponse.json();
    if (!profileResponse.ok) {
      console.error("Profile fetch error:", profileData);
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent("Failed to fetch profile data")}`);
    }

    // 4. Handle registration or login
    if (is_auth) {
      // Check if user exists and is approved
      const existingUser = await prisma.$queryRaw<Array<{
        id: number;
        status: string;
        is_active: string;
      }>>`
        SELECT id, status, is_active FROM admin_users
        WHERE provider_id = ${profileData.data.provider_id}
          AND provider_type = 'provider-id'
      `;

      if (existingUser.length === 0 || existingUser[0].status !== 'approved') {
        // User not found or not approved - redirect to register or show error
        if (existingUser.length === 0) {
          return NextResponse.redirect(`${baseUrl}/register?error=${encodeURIComponent("กรุณาสมัครสมาชิกก่อน")}`);
        }

        if (existingUser[0].status === 'pending') {
          return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent("บัญชีของคุณรอการอนุมัติจากผู้ดูแลระบบ")}`);
        }

        if (existingUser[0].status === 'rejected') {
          return NextResponse.redirect(`${baseUrl}/register?error=${encodeURIComponent("บัญชีของคุณถูกปฏิเสธ กรุณาติดต่อผู้ดูแลระบบ")}`);
        }
      }

      // User is approved - proceed with login
      try {
        const result = await signIn("credentials", {
          "cred-way": "provider-id",
          profile: JSON.stringify(profileData.data),
          redirect: false,
        });

        if (result?.error) {
          return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(result.error)}`);
        }

        // Redirect to landing page
        return NextResponse.redirect(redirectTo);
      } catch (signInError) {
        console.error("Sign in error:", signInError);
        return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent("Sign in failed")}`);
      }
    } else {
      // Registration flow - redirect to register page with profile data
      // Encode profile data as base64 to pass via URL
      // Use encodeURIComponent to handle UTF-8 properly
      const profileJson = JSON.stringify(profileData.data);
      const utf8Encoded = encodeURIComponent(profileJson);
      const encodedProfile = Buffer.from(utf8Encoded).toString('base64');
      
      return NextResponse.redirect(`${baseUrl}/register?profile=${encodedProfile}`);
    }
  } catch (error) {
    console.error("Health ID callback error:", error);
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent("Authentication failed")}`);
  }
}

