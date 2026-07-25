import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/authConfig";
import { shouldBypassAdminAuth } from "@/lib/dev-auth";

/**
 * Middleware wrapper for API routes that require authentication
 * Use this at the start of every protected API route handler
 * 
 * @example
 * export async function GET(request: NextRequest) {
 *   const authError = await requireApiAuth(request);
 *   if (authError) return authError;
 *   // ... rest of your code
 * }
 */
export async function requireApiAuth(request: NextRequest): Promise<NextResponse | null> {
  // Dev mode: /api/admin routes don't require authentication
  if (shouldBypassAdminAuth(request.nextUrl.pathname)) {
    return null;
  }

  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { 
        error: "Unauthorized", 
        message: "Authentication required. Please login first." 
      },
      { status: 401 }
    );
  }
  
  return null;
}









