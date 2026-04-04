import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const authResponse = await requireApiAuth(request);
    if (authResponse) return authResponse;

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");

    let query = `
      SELECT 
        id,
        provider_id,
        provider_type,
        name,
        email,
        hash_cid,
        role,
        is_active,
        status,
        profile_data,
        last_login,
        created_at,
        updated_at
      FROM admin_users
    `;

    const params: any[] = [];
    if (status && status !== "all") {
      query += ` WHERE status = ?`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    const users = await prisma.$queryRawUnsafe<Array<{
      id: number;
      provider_id: string;
      provider_type: string;
      name: string;
      email: string | null;
      hash_cid: string | null;
      role: string;
      is_active: string;
      status: string;
      profile_data: string | null;
      last_login: Date | null;
      created_at: Date;
      updated_at: Date;
    }>>(query, ...params);

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        providerId: user.provider_id,
        providerType: user.provider_type,
        name: user.name,
        email: user.email,
        hashCid: user.hash_cid,
        role: user.role,
        isActive: user.is_active,
        status: user.status,
        profileData: user.profile_data ? (() => {
          try {
            return JSON.parse(user.profile_data);
          } catch {
            return null;
          }
        })() : null,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users", details: error?.message },
      { status: 500 }
    );
  }
}

