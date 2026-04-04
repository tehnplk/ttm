import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Register endpoint - called from Health ID callback
 * Creates a new admin user with status 'pending'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profile } = body;

    if (!profile) {
      return NextResponse.json(
        { error: "Profile data is required" },
        { status: 400 }
      );
    }

    // Parse profile data
    let profileData;
    try {
      profileData = typeof profile === 'string' ? JSON.parse(profile) : profile;
    } catch {
      return NextResponse.json(
        { error: "Invalid profile data format" },
        { status: 400 }
      );
    }

    // Extract provider_id from profile
    const providerId = profileData.provider_id;
    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID not found in profile" },
        { status: 400 }
      );
    }

    // Extract name, email, and hash_cid
    const name = profileData.name_th || profileData.name_eng || providerId;
    const email = profileData.email || null;
    const hashCid = profileData.hash_cid || null;

    // Check if user already exists
    const existingUser = await prisma.$queryRaw<Array<{
      id: number;
      status: string;
    }>>`
      SELECT id, status FROM admin_users
      WHERE provider_id = ${providerId}
        AND provider_type = 'provider-id'
    `;

    if (existingUser.length > 0) {
      const user = existingUser[0];
      
      // If already approved, return error message
      if (user.status === 'approved') {
        return NextResponse.json({
          success: false,
          error: "คุณได้สมัครสมาชิกแล้ว กรุณาเข้าสู่ระบบ",
          alreadyRegistered: true,
        }, { status: 400 });
      }

      // If pending, return error message
      if (user.status === 'pending') {
        return NextResponse.json({
          success: false,
          error: "คุณได้สมัครสมาชิกแล้ว กรุณารอการอนุมัติจากผู้ดูแลระบบ",
          alreadyRegistered: true,
          status: "pending",
        }, { status: 400 });
      }

      // If rejected, allow re-registration
      if (user.status === 'rejected') {
        // Update user to pending
        await prisma.$executeRaw`
          UPDATE admin_users
          SET status = 'pending',
              name = ${name},
              email = ${email},
              hash_cid = ${hashCid},
              profile_data = ${JSON.stringify(profileData)},
              updated_at = NOW()
          WHERE id = ${user.id}
        `;

        return NextResponse.json({
          success: true,
          message: "สมัครสมาชิกสำเร็จ กรุณารอการอนุมัติจากผู้ดูแลระบบ",
          status: "pending",
        });
      }
    }

    // Create new user with pending status
    await prisma.$executeRaw`
      INSERT INTO admin_users (
        provider_id,
        provider_type,
        name,
        email,
        hash_cid,
        role,
        is_active,
        status,
        profile_data,
        created_at,
        updated_at
      ) VALUES (
        ${providerId},
        'provider-id',
        ${name},
        ${email},
        ${hashCid},
        'staff',
        'yes',
        'pending',
        ${JSON.stringify(profileData)},
        NOW(),
        NOW()
      )
    `;

    return NextResponse.json({
      success: true,
      message: "สมัครสมาชิกสำเร็จ กรุณารอการอนุมัติจากผู้ดูแลระบบ",
      status: "pending",
    });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      {
        error: "Failed to register",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}


