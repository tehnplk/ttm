'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import { providerIdProcess } from '@/app/actions/sign-in';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Get error from URL if exists
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      await providerIdProcess(formData);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการล็อกอิน');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 px-4">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-900 text-2xl font-bold text-white">
              BK
            </div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-stone-900">
              เข้าสู่ระบบ Backoffice
            </h1>
            <p className="text-sm text-stone-500">
              เข้าสู่ระบบด้วย Provider ID ผ่าน Health ID
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
              <div className="flex items-center gap-2">
                <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Provider ID Login Form */}
          <form action={handleSubmit} className="space-y-4">
            <input type="hidden" name="landing" value="/admin" />
            <input type="hidden" name="is_auth" value="yes" />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:bg-stone-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>กำลังเข้าสู่ระบบ...</span>
                </>
              ) : (
                <>
                  <Icon icon="solar:login-2-bold" className="h-5 w-5" />
                  <span>เข้าสู่ระบบด้วย Provider ID</span>
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-4 text-center">
            <p className="text-sm text-stone-600 mb-2">ยังไม่มีบัญชี?</p>
            <a
              href="/register"
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-900 hover:text-stone-700 underline"
            >
              <Icon icon="solar:user-plus-bold" className="h-4 w-4" />
              <span>สมัครเข้าใช้งาน</span>
            </a>
          </div>

          {/* Info */}
          <div className="mt-6 rounded-lg bg-stone-50 p-4">
            <p className="text-xs text-stone-600">
              <Icon icon="solar:info-circle-bold" className="mr-1 inline h-4 w-4" />
              ระบบจะตรวจสอบ Provider ID และสิทธิ์การเข้าถึงก่อนเข้าสู่ระบบ
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-stone-500">
          © 2024 กมลาศรม สสจ.พิษณุโลก
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-stone-900 border-r-transparent"></div>
          <p className="text-sm text-stone-500">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

