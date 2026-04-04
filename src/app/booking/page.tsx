'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useBooking } from '@/context/BookingContext';
import { BookingStep } from '@/types';
import { BranchSelection } from '@/components/BranchSelection';
import { ServiceSelection } from '@/components/ServiceSelection';
import { DateSelection } from '@/components/DateSelection';
import { TimeSelection } from '@/components/TimeSelection';
import { StaffSelection } from '@/components/StaffSelection';
import { Confirmation } from '@/components/Confirmation';
import { SuccessScreen } from '@/components/SuccessScreen';
import { MyBookingsScreen } from '@/components/MyBookingsScreen';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { toISODateString } from '@/utils';

function BookingPageContent() {
  const { currentStep, setStep, updateBookingState, bookingState, resetBooking } = useBooking();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string>('');
  const [weeklyBookingCount, setWeeklyBookingCount] = useState<number | null>(null);
  const [bookingEnabled, setBookingEnabled] = useState<boolean>(true);
  const [bookingMessage, setBookingMessage] = useState<string>('');
  const [loadingStatus, setLoadingStatus] = useState(true);
  
  // Get userid from URL parameter
  const userId = searchParams.get('userid');
  const isBookingsRoute = pathname?.startsWith('/bookings');
  
  // ทั้ง /bookings และ /booking ต้องมี userid (เข้าทาง LINE เท่านั้น)
  const hasUserId = Boolean(userId && userId.trim().length > 0);
  

  // Use ref for bookingMessage to avoid dependency array size changes
  const bookingMessageRef = useRef(bookingMessage);
  bookingMessageRef.current = bookingMessage;

  // Redirect to error-message page if booking is disabled
  useEffect(() => {
    if (!loadingStatus && !bookingEnabled && hasUserId) {
      console.log('Redirecting: booking disabled', { bookingEnabled, loadingStatus });
      // Pass message via query param
      const params = new URLSearchParams();
      params.set('type', 'disabled');
      if (bookingMessageRef.current) {
        params.set('message', bookingMessageRef.current);
      }
      router.replace('/booking/error-message?' + params.toString());
    }
  }, [loadingStatus, bookingEnabled, hasUserId, router]);

  // Check booking status on mount and periodically
  useEffect(() => {
    async function checkBookingStatus() {
      try {
        // Add cache-busting to ensure fresh data
        const res = await fetch('/api/booking-status?' + new URLSearchParams({ 
          _t: Date.now().toString() 
        }), {
          cache: 'no-store',
        });
        const data = await res.json();
        console.log("Booking status check:", data, "status:", res.status);
        
        // Check response status
        if (res.ok && data) {
          // Parse enabled status - handle various formats
          const isEnabled = data.enabled === true || data.enabled === 'true' || data.enabled === 'yes' || data.enabled === 'YES' || data.enabled === 1 || data.enabled === '1';
          console.log("Booking enabled:", isEnabled, "from value:", data.enabled);
          setBookingEnabled(isEnabled);
          setBookingMessage(data.message || '');
          
          // If booking becomes disabled while user is in the flow, reset to start
          if (!isEnabled && currentStep !== BookingStep.BRANCH_SELECTION && currentStep !== BookingStep.MY_BOOKINGS) {
            alert(data.message || 'ขณะนี้ระบบจองปิดใช้งานชั่วคราว กรุณารอสักครู่');
            resetBooking();
            setStep(BookingStep.BRANCH_SELECTION);
          }
        } else {
          // If API returns error, default to disabled for safety
          console.error('Booking status API error:', data);
          setBookingEnabled(false);
          setBookingMessage(data.message || 'ไม่สามารถตรวจสอบสถานะการจองได้');
        }
      } catch (error) {
        console.error('Failed to check booking status:', error);
        // On error, default to disabled for safety
        setBookingEnabled(false);
        setBookingMessage('ไม่สามารถตรวจสอบสถานะการจองได้');
      } finally {
        setLoadingStatus(false);
      }
    }
    
    // Check immediately on mount
    void checkBookingStatus();
    
    // Check booking status every 30 seconds to catch changes
    const interval = setInterval(() => {
      void checkBookingStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [currentStep, resetBooking, setStep]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  const handleConfirmBooking = async () => {
    console.log("bookingEnabled", bookingEnabled);
    // Check booking status before submitting
    if (!bookingEnabled) {
      alert(bookingMessage || 'ขณะนี้ระบบจองปิดใช้งานชั่วคราว กรุณารอสักครู่');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: bookingState.branch?.id,
          serviceId: bookingState.service?.id,
          staffId: bookingState.staff?.id,
          date: bookingState.date ? toISODateString(bookingState.date) : undefined,
          time: bookingState.timeSlot?.time,
          timeSlotId: bookingState.timeSlot?.id, // Send time slot ID
          customerName: bookingState.customerName,
          customerPhone: bookingState.customerPhone,
          price: bookingState.service?.price, // Send service price
          note: bookingState.note || '', // Send note if exists
          userId: userId || null, // Send userid from URL parameter
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // If booking is disabled, show the custom message
        if (response.status === 403 && errorData.message) {
          alert(errorData.message);
          return;
        }
        throw new Error(errorData.message || errorData.error || 'Booking failed');
      }

      const data = await response.json();
      setBookingId(data.bookingId || `BK-${Date.now().toString().slice(-6)}`);
      setWeeklyBookingCount(typeof data.weeklyBookingCount === 'number' ? data.weeklyBookingCount : null);
      setStep(BookingStep.SUCCESS);
      
      // Show QR code, no redirect
    } catch (error) {
      console.error('Booking error:', error);
      alert('เกิดข้อผิดพลาดในการจอง กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case BookingStep.BRANCH_SELECTION:
        return (
          <BranchSelection 
            onSelect={(branch, recommendedServiceId) => {
              // Double check before proceeding
              if (!bookingEnabled) {
                alert(bookingMessage || 'ขณะนี้ระบบจองปิดใช้งานชั่วคราว กรุณารอสักครู่');
                return;
              }
              updateBookingState('branch', branch);
              // เก็บ recommendedServiceId ไว้ใน sessionStorage เพื่อส่งต่อไปยัง ServiceSelection
              if (recommendedServiceId) {
                sessionStorage.setItem('recommendedServiceId', recommendedServiceId);
              }
              setStep(BookingStep.SERVICE_SELECTION);
            }}
            onCheckHistory={() => setStep(BookingStep.MY_BOOKINGS)}
          />
        );
      case BookingStep.SERVICE_SELECTION:
        return (
          <ServiceSelection
            branchId={bookingState.branch?.id || ''}
            recommendedId={sessionStorage.getItem('recommendedServiceId') || undefined}
            onSelect={(service) => {
              if (!bookingEnabled) {
                alert(bookingMessage || 'ขณะนี้ระบบจองปิดใช้งานชั่วคราว กรุณารอสักครู่');
                resetBooking();
                setStep(BookingStep.BRANCH_SELECTION);
                return;
              }
              updateBookingState('service', service);
              sessionStorage.removeItem('recommendedServiceId');
              setStep(BookingStep.DATE_SELECTION);
            }}
            onBack={() => setStep(BookingStep.BRANCH_SELECTION)}
          />
        );
      case BookingStep.DATE_SELECTION:
        return (
          <DateSelection
            selectedDate={bookingState.date}
            onSelect={(date) => {
              if (!bookingEnabled) {
                alert(bookingMessage || 'ขณะนี้ระบบจองปิดใช้งานชั่วคราว กรุณารอสักครู่');
                resetBooking();
                setStep(BookingStep.BRANCH_SELECTION);
                return;
              }
              updateBookingState('date', date);
              setStep(BookingStep.TIME_SELECTION);
            }}
            onBack={() => setStep(BookingStep.SERVICE_SELECTION)}
          />
        );
      case BookingStep.TIME_SELECTION:
        return (
          <TimeSelection
            selectedDate={bookingState.date || new Date()}
            selectedTime={bookingState.timeSlot}
            branchId={bookingState.branch?.id}
            onSelect={(slot) => {
              if (!bookingEnabled) {
                alert(bookingMessage || 'ขณะนี้ระบบจองปิดใช้งานชั่วคราว กรุณารอสักครู่');
                resetBooking();
                setStep(BookingStep.BRANCH_SELECTION);
                return;
              }
              updateBookingState('timeSlot', slot);
              setStep(BookingStep.STAFF_SELECTION);
            }}
            onBack={() => setStep(BookingStep.DATE_SELECTION)}
          />
        );
      case BookingStep.STAFF_SELECTION:
        return (
          <StaffSelection
            serviceId={bookingState.service?.id || ''}
            selectedStaff={bookingState.staff}
            date={bookingState.date || new Date()}
            timeSlot={bookingState.timeSlot || { id: '', time: '', available: false }}
            branchId={bookingState.branch?.id}
            onSelect={(staff) => {
              if (!bookingEnabled) {
                alert(bookingMessage || 'ขณะนี้ระบบจองปิดใช้งานชั่วคราว กรุณารอสักครู่');
                resetBooking();
                setStep(BookingStep.BRANCH_SELECTION);
                return;
              }
              updateBookingState('staff', staff);
              setStep(BookingStep.CONFIRMATION);
            }}
            onBack={() => setStep(BookingStep.TIME_SELECTION)}
          />
        );
      case BookingStep.CONFIRMATION:
        return (
          <Confirmation
            bookingState={bookingState}
            onConfirm={handleConfirmBooking}
            onChange={updateBookingState}
            onBack={() => setStep(BookingStep.STAFF_SELECTION)}
            isLoading={isLoading}
          />
        );
      case BookingStep.SUCCESS:
        return (
          <SuccessScreen
            bookingId={bookingId || `BK-${Date.now().toString().slice(-6)}`}
            weeklyBookingCount={weeklyBookingCount}
            onHome={() => {
              resetBooking();
              setWeeklyBookingCount(null);
              setStep(BookingStep.BRANCH_SELECTION);
            }}
            onCheckHistory={() => {
              resetBooking();
              setWeeklyBookingCount(null);
              setStep(BookingStep.MY_BOOKINGS);
            }}
          />
        );
      case BookingStep.MY_BOOKINGS:
        return (
          <MyBookingsScreen
            onBack={() => setStep(BookingStep.BRANCH_SELECTION)}
          />
        );
      default:
        return null;
    }
  };

  // Show disabled message if booking is disabled
  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="text-sm text-stone-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // ถ้าไม่มี userid แสดงข้อความเข้าทางไลน์
  if (!hasUserId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-stone-200 p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-stone-900 mb-2">
              ใช้ผ่าน LINE เท่านั้น
            </h2>
            <p className="text-stone-600">
              กรุณาเข้าสู่ระบบผ่าน LINE เพื่อใช้บริการจองคิว
            </p>
          </div>
          <div className="pt-4 border-t border-stone-200">
            <p className="text-sm text-stone-500">
              หากต้องการจองคิว กรุณาเปิดลิงก์นี้ผ่าน LINE
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while redirecting to error-message page (booking disabled)
  if (!bookingEnabled) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="text-sm text-stone-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {renderStep()}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="text-sm text-stone-500">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <BookingPageContent />
    </Suspense>
  );
}
