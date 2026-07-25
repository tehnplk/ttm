import { NextResponse } from "next/server";
import { auth } from "@/authConfig";
import { shouldBypassAdminAuth } from "@/lib/dev-auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Dev mode: /admin and /api/admin don't require authentication
  if (shouldBypassAdminAuth(pathname)) {
    return NextResponse.next();
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    "/login",
    "/register",
    "/booking",
    "/bookings",
    "/bookingnew", // Public booking page for customers (no auth required)
    "/my-bookings", // Public booking history page
    "/faq", // Public FAQ page
    "/history", // Public booking history page (for LINE users)
    "/historys", // Alias path for history
    "/staff-bookings", // Public page for staff booking viewer
    "/api/staff-bookings", // Public API for staff booking viewer
    "/patient-bookings", // Public page for patient lookup
    "/api/bookings/by-phone", // Public API for patient lookup
    "/api/auth", // NextAuth routes (includes /api/auth/register)
    "/api/webhook/line", // LINE webhook
    "/api/bookings", // Public booking creation and history
    "/api/branches", // Public branch list
    "/api/services", // Public service list
    "/api/staff", // Public staff list (for booking)
    "/api/schedule", // Public schedule
    "/api/opening-hours", // Public opening hours (for booking)
    "/api/slots-availability", // Public slots availability (ว่าง N คน)
    "/api/config", // Public config
    "/api/images", // Public image serving (for uploaded images)
    "/api/faq", // Public FAQ API
    "/api/booking-status", // Public booking status check
    "/api/admin/bookings/broadcast", // Internal broadcast endpoint (called from server)
    "/api/admin/notifications/send", // Public notification send endpoint (for cron)
  ];

  // Normalize pathname (remove trailing slash and query params for comparison)
  const normalizedPath = pathname.replace(/\/$/, '');

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some((route) => {
    // Exact match
    if (normalizedPath === route) {
      return true;
    }
    // Check if path starts with route (for sub-routes)
    if (normalizedPath.startsWith(route + '/')) {
      return true;
    }
    return false;
  });

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For API routes, return 401 instead of redirect
  if (pathname.startsWith("/api/")) {
    if (!req.auth) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // For page routes, redirect to login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If session exists → allow access
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

