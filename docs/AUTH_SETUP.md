# Provider ID Authentication Setup Guide

## Overview

ระบบ authentication ใช้ Health ID และ Provider ID เพื่อเข้าสู่ระบบ backoffice โดยใช้ NextAuth.js v5

## 1. Environment Variables

เพิ่ม environment variables ต่อไปนี้ใน `.env`:

```env
# ===== Auth (Development) =====
AUTH_SECRET="your-auth-secret-here"
AUTH_TRUST_HOST=true
AUTH_URL=http://localhost:3000

# ===== Health ID (Development) =====
HEALTH_CLIENT_ID=your-health-client-id
HEALTH_CLIENT_SECRET=your-health-client-secret
HEALTH_REDIRECT_URI=http://localhost:3000/api/auth/healthid

# ===== Provider ID (Development) =====
PROVIDER_CLIENT_ID=your-provider-client-id
PROVIDER_CLIENT_SECRET=your-provider-client-secret
```

สำหรับ Production (`.env.production`):

```env
AUTH_SECRET="your-production-auth-secret"
AUTH_TRUST_HOST=true
AUTH_URL=https://your-domain.com

HEALTH_CLIENT_ID=your-production-health-client-id
HEALTH_CLIENT_SECRET=your-production-health-client-secret
HEALTH_REDIRECT_URI=https://your-domain.com/api/auth/healthid

PROVIDER_CLIENT_ID=your-production-provider-client-id
PROVIDER_CLIENT_SECRET=your-production-provider-client-secret
```

## 2. Generate AUTH_SECRET

รันคำสั่งนี้เพื่อสร้าง AUTH_SECRET:

```bash
openssl rand -base64 32
```

หรือใช้ online tool: https://generate-secret.vercel.app/32

## 3. Authentication Flow

```
1. User clicks "เข้าสู่ระบบด้วย Provider ID"
   ↓
2. Redirect to Health ID OAuth
   ↓
3. User authenticates with Health ID
   ↓
4. Callback to /api/auth/healthid
   ↓
5. Exchange Health ID token for Provider ID token
   ↓
6. Fetch user profile from Provider ID
   ↓
7. Sign in with NextAuth
   ↓
8. Redirect to /admin
```

## 4. Files Created

- `src/authConfig.ts` - NextAuth configuration
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth API route
- `src/app/api/auth/healthid/route.ts` - Health ID callback handler
- `src/app/actions/sign-in.ts` - Server action to initiate OAuth
- `src/app/actions/logout.ts` - Logout action
- `src/proxy.ts` - Route protection (replaces middleware.ts)
- `src/types/provider.ts` - TypeScript types for Provider ID profile

## 5. Testing

1. ตั้งค่า environment variables
2. เข้าหน้า `/login`
3. คลิก "เข้าสู่ระบบด้วย Provider ID"
4. ระบบจะ redirect ไปยัง Health ID
5. หลังจาก login สำเร็จ จะกลับมาที่ `/admin`

## 6. Troubleshooting

### Error: "AUTH_SECRET is not configured"
- ตรวจสอบว่า AUTH_SECRET ถูกตั้งค่าใน `.env`

### Error: "HEALTH_CLIENT_ID is not configured"
- ตรวจสอบว่า HEALTH_CLIENT_ID และ HEALTH_CLIENT_SECRET ถูกตั้งค่า

### Error: "Failed to fetch Health ID token"
- ตรวจสอบว่า client_id และ client_secret ถูกต้อง
- ตรวจสอบว่า redirect_uri ตรงกับที่ลงทะเบียนไว้

### Error: "Failed to fetch provider data"
- ตรวจสอบว่า PROVIDER_CLIENT_ID และ PROVIDER_CLIENT_SECRET ถูกต้อง

## 7. Session Access

ใน server components:

```typescript
import { auth } from "@/authConfig";

export default async function Page() {
  const session = await auth();
  const profile = session?.user?.profile;
  // ...
}
```

ใน client components:

```typescript
'use client';
import { useSession } from "next-auth/react";

export default function Component() {
  const { data: session } = useSession();
  // ...
}
```

## 8. Profile Structure

Profile data จะถูกเก็บใน session เป็น JSON string:

```typescript
const profile: ProviderProfile = JSON.parse(session.user.profile);
```

ดูรายละเอียด profile structure ใน `src/types/provider.ts`









