import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Verify authentication token
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { authenticated: false, error: "No token provided" },
        { status: 401 },
      );
    }

    // In a real implementation, you would verify the token against a stored session
    // For now, we'll just check if the user exists
    // You should implement proper token verification (JWT, session store, etc.)

    return NextResponse.json({
      authenticated: true,
      message: "Token is valid (basic verification)",
    });
  } catch (error) {
    console.error("Verify auth error", error);
    return NextResponse.json(
      {
        authenticated: false,
        error: "Failed to verify authentication",
      },
      { status: 500 },
    );
  }
}

// Logout
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true, message: "Logged out" });
    
    // Clear cookie
    response.cookies.delete('admin_token');
    
    return response;
  } catch (error) {
    console.error("Logout error", error);
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 },
    );
  }
}









