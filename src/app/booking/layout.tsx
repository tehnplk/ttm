'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { BookingStep } from '@/types';
import { StepIndicator } from '@/components/StepIndicator';
import { ChevronLeft } from 'lucide-react';
import { useBooking } from '@/context/BookingContext';
import { formatThaiDate } from '@/utils';

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { bookingState, currentStep, setStep } = useBooking();

  const handleBack = () => {
    if (currentStep > BookingStep.BRANCH_SELECTION) {
      setStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case BookingStep.BRANCH_SELECTION: return 'กมลาศรม สสจ.พิษณุโลก';
      case BookingStep.SERVICE_SELECTION: return 'เลือกบริการ';
      case BookingStep.DATE_SELECTION: return 'เลือกวันที่';
      case BookingStep.TIME_SELECTION: return 'เลือกเวลา';
      case BookingStep.STAFF_SELECTION: return 'เลือกพนักงาน';
      case BookingStep.CONFIRMATION: return 'ยืนยันการจอง';
      case BookingStep.SUCCESS: return 'จองสำเร็จ';
      case BookingStep.MY_BOOKINGS: return 'ประวัติการจอง';
      default: return 'จองคิว';
    }
  };

  const handleStepClick = (step: BookingStep) => {
    // Only allow navigating to previous steps or the current step
    if (step <= currentStep) {
      setStep(step);
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 font-sans text-stone-800 pb-10">
      <div className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto bg-primary-50 min-h-screen shadow-2xl relative">
        
        {/* Header */}
        <header className="sticky top-0 z-50 bg-primary-700 text-white shadow-md transition-all duration-300">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStep > 0 && currentStep !== BookingStep.SUCCESS && (
                <button 
                  onClick={handleBack}
                  className="p-2 rounded-full hover:bg-primary-600 transition-colors text-white"
                >
                  <ChevronLeft size={24} />
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold leading-none drop-shadow-sm">{getStepTitle()}</h1>
                {currentStep === BookingStep.BRANCH_SELECTION && (
                   <p className="text-primary-100 text-xs mt-1">ยินดีต้อนรับเข้าสู่บริการค่ะ</p>
                )}
              </div>
            </div>
{currentStep > BookingStep.BRANCH_SELECTION && currentStep !== BookingStep.SUCCESS && (
              <button 
                onClick={handleBack}
                className="px-3 py-1.5 bg-primary-600 rounded-full flex items-center justify-center border border-primary-500 shadow-inner hover:bg-primary-500 transition-colors text-white text-sm font-medium"
              >
                ย้อนกลับ
              </button>
            )}
          </div>
          
          <StepIndicator 
            currentStep={currentStep} 
            onStepClick={handleStepClick}
          />
        </header>

        {/* Content */}
        <main className="p-4 pt-6">
          {children}
        </main>

        {/* Footer Summary (Sticky Bottom) */}
        {currentStep > BookingStep.BRANCH_SELECTION && currentStep < BookingStep.CONFIRMATION && (
          <div className="fixed bottom-0 left-0 right-0 z-40">
            <div className="max-w-lg mx-auto bg-white/95 backdrop-blur-md border-t border-stone-200 p-4 shadow-lg-up">
              <div className="flex items-center justify-between text-sm">
                <div className="flex flex-col">
                  <span className="text-stone-400 text-xs">สรุปรายการ</span>
                  <div className="flex items-center gap-2 font-medium text-stone-800">
                    {bookingState.branch?.name && <span>{bookingState.branch.name.split('สาขา')[1]}</span>}
                    {bookingState.service && <span>• {bookingState.service.name}</span>}
                  </div>
                  <div className="text-primary-600 font-bold text-xs mt-0.5">
                    {bookingState.date && <span>{formatThaiDate(bookingState.date)}</span>}
                    {bookingState.timeSlot && <span>, {bookingState.timeSlot.time} น.</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
