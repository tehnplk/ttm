'use client';

import { useEffect, useMemo, useState } from 'react';

type BookingRow = {
  id: string;
  date: string;
  time: string;
  customerName: string;
  staffName: string;
  branchName: string;
  serviceName: string;
  status: string;
};

function normalizePhone(value: string) {
  return value.replace(/\D/g, '').slice(0, 10);
}

function formatDateThai(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTimeLabel(time: string) {
  if (!time) return '-';
  const range = time.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
  if (range) return `${range[1]}-${range[2]}`;
  const parts = time.split('-');
  const lastTwo = parts.slice(-2);
  if (parts[0] === 't' || time.startsWith('t-')) {
    if (lastTwo.length === 2 && /^\d{2}:\d{2}$/.test(lastTwo[0]) && /^\d{2}:\d{2}$/.test(lastTwo[1])) {
      return `${lastTwo[0]}-${lastTwo[1]}`;
    }
  }
  return time;
}

export default function PatientBookingsPage() {
  const [phoneInput, setPhoneInput] = useState('');
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phone = useMemo(() => normalizePhone(phoneInput), [phoneInput]);
  const canSearch = phone.length === 10;

  async function loadBookings() {
    if (!canSearch) return;
    try {
      setLoading(true);
      setError(null);
      setBookings([]);
      const res = await fetch(`/api/bookings/by-phone?phone=${encodeURIComponent(phone)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'โหลดข้อมูลไม่สำเร็จ');
      setBookings(data.bookings || []);
    } catch (err: any) {
      setError(err.message || 'โหลดข้อมูลไม่สำเร็จ');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  // auto search when phone complete
  useEffect(() => {
    if (canSearch) {
      void loadBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">เช็คคิวของฉัน</h1>
        <p className="text-sm text-stone-500">กรอกเบอร์โทรศัพท์เพื่อดูวันเวลาและหมอนวดที่จอง</p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
        <label className="block text-sm font-medium text-stone-700">เบอร์โทร (10 หลัก)</label>
        <input
          type="tel"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          maxLength={13}
          placeholder="0xxxxxxxxx"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-base tracking-wide focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
        />
        <button
          onClick={loadBookings}
          disabled={!canSearch || loading}
          className="w-full rounded-lg bg-primary-600 px-4 py-2 text-base font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'กำลังโหลด...' : 'ค้นหา'}
        </button>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-4 py-3 text-base font-semibold text-stone-800">
          ผลการค้นหา
        </div>
        {loading ? (
          <div className="p-4 text-base text-stone-500">กำลังโหลด...</div>
        ) : bookings.length === 0 ? (
          <div className="p-4 text-base text-stone-500">ไม่พบข้อมูล</div>
        ) : (
          <div className="grid gap-3 p-4">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 shadow-sm">
                <div className="mb-2 text-base font-semibold text-stone-900">ชื่อผู้จอง: {b.customerName}</div>
                <div className="flex items-center justify-between text-sm text-stone-500">
                  <span>วันที่</span>
                  <span className="font-semibold text-stone-800">{formatDateThai(b.date)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-stone-500">
                  <span>เวลา</span>
                  <span className="font-semibold text-stone-800">{formatTimeLabel(b.time)}</span>
                </div>
                <div className="mt-2 text-base font-semibold text-stone-900">{b.serviceName}</div>
                <div className="text-sm text-primary-700">หมอ: {b.staffName}</div>
                <div className="text-sm text-stone-600">{b.branchName}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



