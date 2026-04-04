'use client';

import { useEffect, useMemo, useState } from 'react';

type StaffOption = { id: string; name: string };
type BookingRow = {
  id: string;
  customerName: string;
  customerPhone: string;
  time: string;
  serviceName: string;
  status: string;
};

function formatTimeLabel(time: string) {
  if (!time) return "-";
  const range = time.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
  if (range) {
    return `${range[1]}-${range[2]}`;
  }
  // Handle slot id format t-x-HH:MM-HH:MM
  const parts = time.split("-");
  const lastTwo = parts.slice(-2);
  if (parts[0] === "t" || time.startsWith("t-")) {
    if (
      lastTwo.length === 2 &&
      /^\d{2}:\d{2}$/.test(lastTwo[0]) &&
      /^\d{2}:\d{2}$/.test(lastTwo[1])
    ) {
      return `${lastTwo[0]}-${lastTwo[1]}`;
    }
  }
  return time;
}

export default function StaffBookingsPage() {
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().slice(0, 10));
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // load staff (public staff API)
  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await fetch('/api/staff', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'โหลดรายชื่อพนักงานไม่สำเร็จ');
        const mapped: StaffOption[] = (data.staff || []).map((s: any) => ({
          id: String(s.id),
          name: s.name,
        }));
        setStaffList(mapped);
      } catch (err: any) {
        setError(err.message || 'โหลดรายชื่อพนักงานไม่สำเร็จ');
      }
    }
    void loadStaff();
  }, []);

  const canFetch = useMemo(() => selectedStaff && selectedDate, [selectedStaff, selectedDate]);

  async function loadBookings() {
    if (!canFetch) return;
    try {
      setLoading(true);
      setError(null);
      const url = `/api/staff-bookings?staffId=${encodeURIComponent(selectedStaff)}&date=${encodeURIComponent(selectedDate)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'โหลดข้อมูลการจองไม่สำเร็จ');
      setBookings(data.bookings || []);
    } catch (err: any) {
      setError(err.message || 'โหลดข้อมูลการจองไม่สำเร็จ');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaff, selectedDate]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">ดูคิวหมอนวด</h1>
        <p className="text-sm text-stone-500">เลือกพนักงานและวันที่ เพื่อดูรายชื่อลูกค้าที่จอง</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">หมอนวด</label>
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="">-- เลือกพนักงาน --</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">วันที่</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={loadBookings}
          disabled={!canFetch || loading}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
        </button>
        {error && <span className="text-sm text-rose-600">{error}</span>}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-4 py-3 text-base font-semibold text-stone-800">
          รายการจอง
        </div>
        {loading ? (
          <div className="p-4 text-base text-stone-500">กำลังโหลด...</div>
        ) : bookings.length === 0 ? (
          <div className="p-4 text-base text-stone-500">ไม่พบข้อมูล</div>
        ) : (
          <div className="grid gap-3 p-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-stone-500">เวลา</span>
                  <span className="text-lg font-mono font-semibold text-stone-900">
                    {formatTimeLabel(b.time)}
                  </span>
                </div>
                <div className="text-base font-semibold text-stone-900">{b.customerName}</div>
                <div className="text-sm text-stone-600">{b.customerPhone}</div>
                <div className="text-sm text-primary-700 mt-1">{b.serviceName}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

