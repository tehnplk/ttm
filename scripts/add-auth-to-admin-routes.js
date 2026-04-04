// Script to add auth check to all remaining admin API routes
// This is a helper script - run manually for remaining routes

const routes = [
  'src/app/api/admin/staff/route.ts',
  'src/app/api/admin/staff/[id]/route.ts',
  'src/app/api/admin/branches/route.ts',
  'src/app/api/admin/branches/[id]/route.ts',
  'src/app/api/admin/services/route.ts',
  'src/app/api/admin/services/[id]/route.ts',
  'src/app/api/admin/schedule/route.ts',
  'src/app/api/admin/schedule/[id]/route.ts',
  'src/app/api/admin/staff-holidays/route.ts',
  'src/app/api/admin/staff-holidays/[id]/route.ts',
  'src/app/api/admin/positions/route.ts',
  'src/app/api/admin/opening-hours/route.ts',
  'src/app/api/admin/settings/route.ts',
  'src/app/api/admin/upload/route.ts',
];

// Import pattern to add:
// import { requireApiAuth } from "@/lib/api-auth";
// 
// In each handler function, add at the start:
// const authError = await requireApiAuth(request);
// if (authError) return authError;









