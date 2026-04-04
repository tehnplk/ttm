'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MyBookingsScreen } from '@/components/MyBookingsScreen';

export default function MyBookingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-primary-50 font-sans text-stone-800 p-4">
      <div className="max-w-lg mx-auto">
        <MyBookingsScreen onBack={() => router.push('/booking/branch')} />
      </div>
    </div>
  );
}
