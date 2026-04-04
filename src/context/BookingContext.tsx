'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BookingStep, BookingState, Branch, Service, Staff, TimeSlot } from '@/types';

interface BookingContextType {
  bookingState: BookingState;
  setBookingState: React.Dispatch<React.SetStateAction<BookingState>>;
  updateBookingState: (field: keyof BookingState, value: any) => void;
  resetBooking: () => void;
  currentStep: BookingStep;
  setStep: (step: BookingStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

const initialBookingState: BookingState = {
  branch: null,
  service: null,
  date: null,
  timeSlot: null,
  staff: null,
  customerName: '',
  customerPhone: '',
  note: ''
};

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [bookingState, setBookingState] = useState<BookingState>(initialBookingState);
  const [currentStep, setCurrentStep] = useState<BookingStep>(BookingStep.BRANCH_SELECTION);

  const updateBookingState = (field: keyof BookingState, value: any) => {
    setBookingState(prev => ({ ...prev, [field]: value }));
  };

  const resetBooking = () => {
    setBookingState(initialBookingState);
    setCurrentStep(BookingStep.BRANCH_SELECTION);
  };

  const setStep = (step: BookingStep) => {
    setCurrentStep(step);
  };

  const goToNextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, BookingStep.SUCCESS));
  };

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, BookingStep.BRANCH_SELECTION));
  };

  return (
    <BookingContext.Provider value={{ 
      bookingState, 
      setBookingState, 
      updateBookingState, 
      resetBooking,
      currentStep,
      setStep,
      goToNextStep,
      goToPreviousStep
    }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
