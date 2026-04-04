'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

interface ProfileData {
  provider_id: string;
  name_th?: string;
  name_eng?: string;
  email?: string;
  title_th?: string;
  firstname_th?: string;
  lastname_th?: string;
  [key: string]: any;
}

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  // Get profile data from URL or error/success messages
  useEffect(() => {
    const profileParam = searchParams.get('profile');
    const errorParam = searchParams.get('error');
    const successParam = searchParams.get('success');

    if (profileParam) {
      try {
        // Decode base64 in browser, then decode URI component to handle UTF-8
        const base64Decoded = atob(profileParam);
        const decoded = decodeURIComponent(base64Decoded);
        const profile: ProfileData = JSON.parse(decoded);
        setProfileData(profile);
        
        // Pre-fill form with profile data
        // Try to get the best name from available fields
        let displayName = '';
        if (profile.name_th) {
          displayName = profile.name_th;
        } else if (profile.name_eng) {
          displayName = profile.name_eng;
        } else if (profile.firstname_th || profile.lastname_th) {
          displayName = `${profile.firstname_th || ''} ${profile.lastname_th || ''}`.trim();
        } else {
          displayName = profile.provider_id;
        }
        
        setFormData({
          name: displayName,
          email: profile.email || '',
        });
      } catch (err) {
        console.error('Error parsing profile data:', err);
        setError('ไม่สามารถอ่านข้อมูลจาก Provider ID ได้');
      }
    }

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }

    if (successParam === 'true') {
      setSuccess(true);
      // Auto redirect after 3 seconds
      setTimeout(() => {
        window.location.href = process.env.NEXT_PUBLIC_BOOKING_URL || '';
      }, 3000);
    }
  }, [searchParams]);

  async function handleProviderIdAuth() {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('landing', '/register');
      formData.append('is_auth', 'no');
      
      const response = await fetch('/api/auth/provider-id', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
        setLoading(false);
        return;
      }

      // Redirect to Health ID OAuth URL
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setError('ไม่พบ URL สำหรับ redirect');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Provider ID auth error:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!profileData) {
      setError('ไม่พบข้อมูลจาก Provider ID');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: JSON.stringify({
            ...profileData,
            name_th: formData.name,
            name_eng: formData.name,
            email: formData.email,
          }),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Check if already registered
        if (data.alreadyRegistered) {
          setError(data.error || 'คุณได้สมัครสมาชิกแล้ว');
          // Clear profile data to prevent re-submission
          setProfileData(null);
          setFormData({ name: '', email: '' });
        } else {
          setError(data.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
        }
        setSubmitting(false);
        return;
      }

      // Success - show success message
      setProfileData(null);
      setSubmitting(false);
      setSuccess(true);
      
      // Auto redirect after 3 seconds
      setTimeout(() => {
        window.location.href = process.env.NEXT_PUBLIC_BOOKING_URL || '';
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Register Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-900 text-2xl font-bold text-white">
              BK
            </div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-stone-900">
              {profileData ? 'ตรวจสอบข้อมูลการสมัคร' : 'สมัครเข้าใช้งาน Backoffice'}
            </h1>
            <p className="text-sm text-stone-500">
              {profileData ? 'กรุณาตรวจสอบและแก้ไขข้อมูลก่อนบันทึก' : 'สมัครด้วย Provider ID ผ่าน Health ID'}
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
              <div className="flex items-center gap-2">
                <Icon icon="solar:check-circle-bold" className="h-5 w-5" />
                <div>
                  <p className="text-sm font-semibold">บันทึกสมัครเสร็จ</p>
                  <p className="text-xs mt-1">กรุณารอการอนุมัติจากผู้ดูแลระบบก่อนเข้าสู่ระบบ</p>
                  <p className="text-xs mt-1 text-emerald-600">กำลัง redirect อัตโนมัติใน 3 วินาที...</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
              <div className="flex items-center gap-2">
                <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Registration Form */}
          {!success && (
            <>
              {profileData ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Provider ID (Read-only) */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">
                      Provider ID
                    </label>
                    <input
                      type="text"
                      value={profileData.provider_id}
                      disabled
                      className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-600"
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">
                      ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                      placeholder="กรุณากรอกชื่อ-นามสกุล"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">
                      อีเมล
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                      placeholder="กรุณากรอกอีเมล (ถ้ามี)"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileData(null);
                        setFormData({ name: '', email: '' });
                        router.replace('/register');
                      }}
                      className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !formData.name.trim()}
                      className="flex-1 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:bg-stone-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          <span>กำลังบันทึก...</span>
                        </>
                      ) : (
                        <>
                          <Icon icon="solar:check-circle-bold" className="h-4 w-4" />
                          <span>บันทึกการสมัคร</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={handleProviderIdAuth}
                    disabled={loading}
                    className="w-full rounded-lg bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:bg-stone-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        <span>กำลังดึงข้อมูล...</span>
                      </>
                    ) : (
                      <>
                        <Icon icon="solar:user-plus-bold" className="h-5 w-5" />
                        <span>ดึงข้อมูลจาก Provider ID</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Info */}
          <div className="mt-6 rounded-lg bg-stone-50 p-4">
            <p className="text-xs text-stone-600">
              <Icon icon="solar:info-circle-bold" className="mr-1 inline h-4 w-4" />
              {profileData 
                ? 'กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนกดบันทึก'
                : 'ระบบจะดึงข้อมูลจาก Provider ID และให้คุณตรวจสอบก่อนบันทึก'}
            </p>
          </div>

          {/* Back to Login */}
          {!profileData && (
            <div className="mt-4 text-center">
              <button
                onClick={() => router.push('/login')}
                className="text-sm text-stone-600 hover:text-stone-900 underline"
              >
                กลับไปหน้าเข้าสู่ระบบ
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-stone-500">
          © 2024 กมลาศรม สสจ.พิษณุโลก
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-stone-900 border-r-transparent"></div>
          <p className="text-sm text-stone-500">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  );
}
