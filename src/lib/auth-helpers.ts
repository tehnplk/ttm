import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/authConfig";

/**
 * Check if user is authenticated
 * Returns the session if authenticated, null otherwise
 */
export async function getAuthSession() {
  const session = await auth();
  return session;
}

/**
 * Middleware helper to protect API routes
 * Returns NextResponse with 401 if not authenticated, null if authenticated
 */
export async function requireAuth(request: NextRequest) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }
  
  return null;
}

/**
 * Get authenticated user from session
 */
export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  
  // Parse profile if exists
  const rawProfile = (session.user as any)?.profile as string | undefined;
  let profile = null;
  if (rawProfile) {
    try {
      profile = JSON.parse(rawProfile);
    } catch {
      // Profile parsing failed, ignore
    }
  }
  
  return {
    ...session.user,
    profile,
  };
}









