'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';

type Booking = {
  id: number;
  bookingId: string;
  branchName: string;
  serviceName: string;
  staffName: string;
  customerName: string;
  date: string;
  time: string;
  status: string;
  confirmDatetime: string | null;
  createdAt: string;
};

function HistoryContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userid');
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBookings() {
      if (!userId) {
        setError('ไม่พบ User ID');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/bookings/history?userid=${encodeURIComponent(userId)}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'ไม่สามารถดึงข้อมูลได้');
        }
        
        setBookings(data.bookings || []);
      } catch (err: any) {
        setError(err.message || 'เกิดข้อผิดพลาด');
      } finally {
        setLoading(false);
      }
    }

    void fetchBookings();
  }, [userId]);

  // Format date to Thai
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString('th-TH', { month: 'short' });
    const year = date.getFullYear() + 543;
    const weekday = date.toLocaleDateString('th-TH', { weekday: 'short' });
    return `${weekday} ${day} ${month} ${year.toString().slice(-2)}`;
  };

  // Format time
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    // Handle format "t-0-08:30-10:30" or "08:30 - 10:30"
    if (timeStr.startsWith('t-')) {
      const match = timeStr.match(/(\d{2}:\d{2})-(\d{2}:\d{2})$/);
      if (match) {
        return `${match[1]} - ${match[2]} น.`;
      }
    }
    if (timeStr.includes(' - ')) {
      return `${timeStr} น.`;
    }
    return `${timeStr} น.`;
  };

  // Get status badge
  const getStatusBadge = (status: string, confirmDatetime: string | null) => {
    if (status === 'completed' || confirmDatetime) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          <Icon icon="solar:check-circle-bold" className="w-3.5 h-3.5" />
          มาแล้ว
        </span>
      );
    }
    if (status === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
          <Icon icon="solar:close-circle-bold" className="w-3.5 h-3.5" />
          ยกเลิก
        </span>
      );
    }
    if (status === 'confirmed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Icon icon="solar:clock-circle-bold" className="w-3.5 h-3.5" />
          ยืนยันแล้ว
        </span>
      );
    }
    return null;
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
            <Icon icon="solar:user-cross-bold" className="h-8 w-8 text-rose-600" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">ไม่พบ User ID</h1>
          <p className="text-sm text-stone-600">กรุณาเข้าผ่าน LINE เพื่อดูประวัติการจอง</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="text-sm text-stone-500">กำลังโหลดประวัติการจอง...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
            <Icon icon="solar:danger-triangle-bold" className="h-8 w-8 text-rose-600" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">เกิดข้อผิดพลาด</h1>
          <p className="text-sm text-stone-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-stone-100">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
              <Icon icon="solar:calendar-bold" className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-900">ประวัติการจอง</h1>
              <p className="text-xs text-stone-500">รายการจองทั้งหมดของคุณ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-stone-100">
              <Icon icon="solar:calendar-minimalistic-bold" className="h-10 w-10 text-stone-400" />
            </div>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">ยังไม่มีประวัติการจอง</h2>
            <p className="text-sm text-stone-500">เมื่อคุณทำการจองแล้ว รายการจะแสดงที่นี่</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon="solar:ticket-bold" className="h-4 w-4 text-white/80" />
                    <span className="text-sm font-medium text-white">{booking.bookingId || `#${booking.id}`}</span>
                  </div>
                  {getStatusBadge(booking.status, booking.confirmDatetime)}
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Customer Name */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                      <Icon icon="solar:user-id-bold" className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{booking.customerName || '-'}</p>
                      <p className="text-xs text-stone-500">ชื่อลูกค้า</p>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
                      <Icon icon="solar:calendar-date-bold" className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{formatDate(booking.date)}</p>
                      <p className="text-xs text-stone-500">{formatTime(booking.time)}</p>
                    </div>
                  </div>

                  {/* Branch */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                      <Icon icon="solar:buildings-2-bold" className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{booking.branchName || '-'}</p>
                      <p className="text-xs text-stone-500">สาขา</p>
                    </div>
                  </div>

                  {/* Service */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                      <Icon icon="solar:hand-stars-bold" className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{booking.serviceName || '-'}</p>
                      <p className="text-xs text-stone-500">บริการ</p>
                    </div>
                  </div>

                  {/* Staff */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                      <Icon icon="solar:user-bold" className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{booking.staffName || '-'}</p>
                      <p className="text-xs text-stone-500">พนักงาน</p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="bg-stone-50 px-4 py-2 border-t border-stone-100">
                  <p className="text-xs text-stone-400">
                    จองเมื่อ: {booking.createdAt ? new Date(booking.createdAt).toLocaleString('th-TH') : '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="text-sm text-stone-500">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <HistoryContent />
    </Suspense>
  );
}




