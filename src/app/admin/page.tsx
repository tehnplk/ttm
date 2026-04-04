'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';

interface DashboardStats {
  totalBranches: number;
  totalServices: number;
  totalStaff: number;
  todayBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  todayRevenue: number;
  monthlyRevenue: number;
}

interface BookingByStatus {
  status: string;
  count: number;
}

interface RecentBooking {
  id: number;
  bookerName: string;
  bookerTel: string;
  bookDate: string;
  bookTime: string;
  status: string;
  branchName: string;
  serviceName: string;
}

interface BookingByBranch {
  branchId: number | null;
  branchName: string;
  count: number;
}

interface DashboardData {
  stats: DashboardStats;
  todayBookingsByStatus: BookingByStatus[];
  recentBookings: RecentBooking[];
  bookingsByBranch: BookingByBranch[];
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-stone-100 text-stone-700';
    case 'confirmed':
      return 'bg-blue-100 text-blue-700';
    case 'completed':
      return 'bg-emerald-100 text-emerald-700';
    case 'cancelled':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-stone-100 text-stone-700';
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'pending':
      return 'รอยืนยัน';
    case 'confirmed':
      return 'ยืนยันแล้ว';
    case 'completed':
      return 'เสร็จสิ้น';
    case 'cancelled':
      return 'ยกเลิก';
    default:
      return status;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/dashboard');
        const dashboardData = await res.json();
        if (!res.ok) {
          throw new Error(dashboardData.error || 'Failed to load dashboard');
        }
        setData(dashboardData);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    }
    void loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="text-sm text-stone-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-center">
        <p className="text-rose-600">{error || 'ไม่สามารถโหลดข้อมูลได้'}</p>
      </div>
    );
  }

  const { stats, todayBookingsByStatus, recentBookings, bookingsByBranch } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-1 text-2xl font-bold tracking-tight">
          Dashboard ผู้ดูแลระบบ
        </h1>
        <p className="text-sm text-stone-500">
          ภาพรวมของสาขา บริการ พนักงาน และสถานะการจอง ในมุมมอง Admin
        </p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-gradient-to-br from-white to-primary-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500">จำนวนสาขา</p>
              <p className="mt-2 text-3xl font-bold text-primary-700">{stats.totalBranches}</p>
            </div>
            <div className="rounded-full bg-primary-100 p-3">
              <Icon icon="solar:shop-2-bold" className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-gradient-to-br from-white to-blue-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500">การจองวันนี้</p>
              <p className="mt-2 text-3xl font-bold text-blue-700">{stats.todayBookings}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Icon icon="solar:calendar-bold" className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-gradient-to-br from-white to-emerald-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500">พนักงานทั้งหมด</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.totalStaff}</p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3">
              <Icon icon="solar:users-group-rounded-bold" className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-gradient-to-br from-white to-amber-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500">รายได้วันนี้</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{formatCurrency(stats.todayRevenue)}</p>
            </div>
            <div className="rounded-full bg-amber-100 p-3">
              <Icon icon="solar:wallet-money-bold" className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Booking Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500">รอยืนยัน</p>
              <p className="mt-1 text-2xl font-semibold text-stone-700">{stats.pendingBookings}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center">
              <Icon icon="solar:clock-circle-bold" className="h-5 w-5 text-stone-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500">ยืนยันแล้ว</p>
              <p className="mt-1 text-2xl font-semibold text-blue-700">{stats.confirmedBookings}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Icon icon="solar:check-circle-bold" className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500">เสร็จสิ้น</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{stats.completedBookings}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Icon icon="solar:check-read-bold" className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500">ยกเลิก</p>
              <p className="mt-1 text-2xl font-semibold text-rose-700">{stats.cancelledBookings}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
              <Icon icon="solar:close-circle-bold" className="h-5 w-5 text-rose-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-800">การจองล่าสุด</h2>
            <Link
              href="/admin/bookings"
              className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
            >
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="space-y-3">
            {recentBookings.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-400">ยังไม่มีรายการจอง</p>
            ) : (
              recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-lg border border-stone-100 bg-stone-50 p-3 transition-colors hover:bg-stone-100"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-900 truncate">{booking.bookerName}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {booking.branchName} • {booking.serviceName}
                      </p>
                      <p className="mt-1 text-xs text-stone-400">
                        {new Date(booking.bookDate).toLocaleDateString('th-TH')} • {booking.bookTime}
                      </p>
                    </div>
                    <span
                      className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(booking.status)}`}
                    >
                      {getStatusText(booking.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bookings by Branch */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-stone-800">การจองตามสาขา (วันนี้)</h2>
          <div className="space-y-3">
            {bookingsByBranch.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-400">ยังไม่มีรายการจองวันนี้</p>
            ) : (
              bookingsByBranch.map((item, index) => (
                <div key={item.branchId || index} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900 truncate">{item.branchName}</p>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-stone-200">
                      <div
                        className="h-full rounded-full bg-primary-600"
                        style={{
                          width: `${Math.min((item.count / stats.todayBookings) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-stone-700 w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/bookings"
          className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-100 p-2">
              <Icon icon="solar:calendar-bold" className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">จัดการการจอง</p>
              <p className="text-xs text-stone-500">ดูและจัดการรายการจอง</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/branches"
          className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-100 p-2">
              <Icon icon="solar:shop-2-bold" className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">จัดการสาขา</p>
              <p className="text-xs text-stone-500">เพิ่ม/แก้ไขสาขา</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/services"
          className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-100 p-2">
              <Icon icon="solar:heart-pulse-bold" className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">จัดการบริการ</p>
              <p className="text-xs text-stone-500">เพิ่ม/แก้ไขบริการ</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/staff"
          className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-100 p-2">
              <Icon icon="solar:users-group-rounded-bold" className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">จัดการพนักงาน</p>
              <p className="text-xs text-stone-500">เพิ่ม/แก้ไขพนักงาน</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

