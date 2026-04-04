"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ErrorMessageContent() {
  const searchParams = useSearchParams();
  const [errorType, setErrorType] = useState<'line-only' | 'disabled' | 'loading'>('loading');
  const [bookingMessage, setBookingMessage] = useState<string>('');

  useEffect(() => {
    async function checkStatus() {
      // Check if type is passed via query param (from redirect)
      const typeParam = searchParams.get('type');
      const messageParam = searchParams.get('message');
      
      if (typeParam === 'disabled') {
        // Redirected from booking page because booking is disabled
        setErrorType('disabled');
        setBookingMessage(messageParam || '');
        return;
      }

      // Check if user has userid (came from LINE)
      const hasUserId = searchParams.get('userid');
      
      if (!hasUserId) {
        // No userid - show LINE only message
        setErrorType('line-only');
        return;
      }

      // Check if booking is disabled
      try {
        const res = await fetch('/api/booking-status?' + new URLSearchParams({ 
          _t: Date.now().toString() 
        }), {
          cache: 'no-store',
        });
        const data = await res.json();
        
        if (res.ok && data) {
          const isEnabled = data.enabled === true || data.enabled === 'true' || data.enabled === 'yes' || data.enabled === 'YES' || data.enabled === 1 || data.enabled === '1';
          
          if (!isEnabled) {
            setErrorType('disabled');
            setBookingMessage(data.message || '');
          } else {
            // Booking is enabled but user somehow landed here
            setErrorType('line-only');
          }
        } else {
          setErrorType('disabled');
          setBookingMessage(data.message || 'ไม่สามารถตรวจสอบสถานะการจองได้');
        }
      } catch {
        setErrorType('disabled');
        setBookingMessage('ไม่สามารถตรวจสอบสถานะการจองได้');
      }
    }

    void checkStatus();
  }, [searchParams]);

  if (errorType === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="text-sm text-stone-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (errorType === 'disabled') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 px-4 py-8">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-xl text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="mb-4 text-2xl font-bold tracking-tight text-stone-900">
              ระบบจองปิดใช้งานชั่วคราว
            </h1>
            {bookingMessage ? (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left">
                <p className="text-sm text-amber-800 whitespace-pre-line">
                  {bookingMessage}
                </p>
              </div>
            ) : (
              <p className="mb-6 text-sm text-stone-600">
                ขณะนี้ระบบจองปิดปรับปรุง กรุณารอสักครู่ หรือติดต่อสอบถามที่เบอร์โทร
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default: LINE only message
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-xl text-center">
          {/* LINE Logo */}
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#06C755]">
            <svg className="h-12 w-12 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
          </div>
          <h1 className="mb-4 text-2xl font-bold tracking-tight text-stone-900">
            กรุณาจองผ่าน LINE เท่านั้น
          </h1>
          <p className="mb-6 text-sm text-stone-600">
            เพื่อความสะดวกในการรับการแจ้งเตือนและยืนยันการจอง กรุณาจองผ่าน LINE Official Account ของเรา
          </p>
          <div className="space-y-3">
            <a
              href="https://line.me/R/ti/p/@kamalasrom"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#06C755] px-6 py-3 text-white font-semibold hover:bg-[#05B34C] transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
              เพิ่มเพื่อน LINE
            </a>
            <p className="text-xs text-stone-500">
              หรือค้นหา LINE ID: <span className="font-mono font-semibold">@kamalasrom</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ErrorMessagePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="text-sm text-stone-500">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <ErrorMessageContent />
    </Suspense>
  );
}
