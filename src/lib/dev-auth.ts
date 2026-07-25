/**
 * Dev-only auth bypass for the admin console.
 *
 * In development, /admin pages and /api/admin routes are accessible without
 * logging in. Always disabled in production builds.
 */
export const isDevAuthBypass = process.env.NODE_ENV !== "production";

/**
 * True for /admin pages and /api/admin routes (including sub-routes)
 */
export function isAdminPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "");
  return (
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/api/admin" ||
    path.startsWith("/api/admin/")
  );
}

/**
 * True when the request should skip authentication (dev + admin path)
 */
export function shouldBypassAdminAuth(pathname: string): boolean {
  return isDevAuthBypass && isAdminPath(pathname);
}
