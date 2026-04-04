'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

type ReportType = 'overview' | 'branch' | 'service' | 'staff' | 'customer' | 'time' | 'status';

interface ReportData {
  reportType: string;
  period: { start: string; end: string };
  [key: string]: any;
}

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportType>('overview');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date range filter
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Filters
  const [branchId, setBranchId] = useState<string>('');
  const [serviceId, setServiceId] = useState<string>('');
  const [staffId, setStaffId] = useState<string>('');

  useEffect(() => {
    loadReport();
  }, [activeTab, startDate, endDate, branchId, serviceId, staffId]);

  async function loadReport() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        type: activeTab,
        startDate,
        endDate,
      });

      if (branchId) params.append('branchId', branchId);
      if (serviceId) params.append('serviceId', serviceId);
      if (staffId) params.append('staffId', staffId);

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load report');
      }

      setReportData(data);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดรายงานได้');
      console.error('Load report error:', err);
    } finally {
      setLoading(false);
    }
  }

  const tabs: Array<{ id: ReportType; label: string; icon: string }> = [
    { id: 'overview', label: 'ภาพรวมทั้งหมด', icon: 'solar:chart-2-bold' },
    { id: 'branch', label: 'ตามสาขา', icon: 'solar:buildings-3-bold' },
    { id: 'service', label: 'ตามบริการ', icon: 'solar:heart-pulse-bold' },
    { id: 'staff', label: 'ตามพนักงาน', icon: 'solar:users-group-rounded-bold' },
    { id: 'customer', label: 'ลูกค้า', icon: 'solar:user-id-bold' },
    { id: 'time', label: 'ตามเวลา', icon: 'solar:clock-circle-bold' },
    { id: 'status', label: 'สถานะ', icon: 'solar:checklist-bold' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-1 text-2xl font-bold tracking-tight">รายงาน</h1>
        <p className="text-sm text-stone-500">
          วิเคราะห์และดูสถิติการจองตามหมวดหมู่ต่างๆ
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-semibold text-stone-700">วันที่เริ่มต้น</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-semibold text-stone-700">วันที่สิ้นสุด</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
          <button
            onClick={() => {
              const today = new Date();
              const last30Days = new Date();
              last30Days.setDate(last30Days.getDate() - 30);
              setStartDate(last30Days.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
            }}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
          >
            30 วันล่าสุด
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-stone-900 text-stone-900'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Icon icon={tab.icon} className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <div className="flex items-center gap-2">
            <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
            <p className="text-sm text-stone-500">กำลังโหลดรายงาน...</p>
          </div>
        </div>
      )}

      {/* Report Content */}
      {!loading && reportData && (
        <div className="space-y-6">
          {activeTab === 'overview' && <OverviewReport data={reportData} />}
          {activeTab === 'branch' && <BranchReport data={reportData} />}
          {activeTab === 'service' && <ServiceReport data={reportData} />}
          {activeTab === 'staff' && <StaffReport data={reportData} />}
          {activeTab === 'customer' && <CustomerReport data={reportData} />}
          {activeTab === 'time' && <TimeReport data={reportData} />}
          {activeTab === 'status' && <StatusReport data={reportData} />}
        </div>
      )}

      {/* No Data Message */}
      {!loading && !error && reportData && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-8 text-center">
          <Icon icon="solar:chart-2-bold" className="mx-auto h-12 w-12 text-stone-400" />
          <p className="mt-4 text-sm font-medium text-stone-600">ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
          <p className="mt-1 text-xs text-stone-500">ลองเปลี่ยนช่วงวันที่หรือเลือกช่วงเวลาอื่น</p>
        </div>
      )}
    </div>
  );
}

// Overview Report Component
function OverviewReport({ data }: { data: ReportData }) {
  const hasData = data.summary?.totalBookings > 0 || (data.topBranches && data.topBranches.length > 0) || (data.topServices && data.topServices.length > 0);

  if (!hasData) {
    return (
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-8 text-center">
        <Icon icon="solar:chart-2-bold" className="mx-auto h-12 w-12 text-stone-400" />
        <p className="mt-4 text-sm font-medium text-stone-600">ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
        <p className="mt-1 text-xs text-stone-500">ลองเปลี่ยนช่วงวันที่หรือเลือกช่วงเวลาอื่น</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-stone-500">การจองทั้งหมด</p>
          <p className="mt-2 text-3xl font-bold text-stone-900">{data.summary?.totalBookings || 0}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-stone-500">รายได้รวม</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(data.summary?.totalRevenue || 0)}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-stone-500">สาขายอดนิยม</p>
          <p className="mt-2 text-lg font-semibold text-stone-900">
            {data.topBranches?.[0]?.branchName || 'ไม่ระบุ'}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-stone-500">บริการยอดนิยม</p>
          <p className="mt-2 text-lg font-semibold text-stone-900">
            {data.topServices?.[0]?.serviceName || 'ไม่ระบุ'}
          </p>
        </div>
      </div>

      {/* Bookings by Status */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-stone-800">การจองตามสถานะ</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.bookingsByStatus?.map((item: any) => (
            <div key={item.status} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
              <p className="text-xs text-stone-500">{getStatusText(item.status)}</p>
              <p className="mt-1 text-2xl font-bold text-stone-900">{item.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Branches */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-stone-800">สาขายอดนิยม</h2>
        <div className="space-y-3">
          {data.topBranches?.map((branch: any, index: number) => (
            <div key={branch.branchId || index} className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 p-3">
              <div>
                <p className="font-medium text-stone-900">{branch.branchName}</p>
                <p className="text-xs text-stone-500">{branch.count} การจอง</p>
              </div>
              <p className="text-sm font-semibold text-emerald-700">
                {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(branch.revenue || 0)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Services */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-stone-800">บริการยอดนิยม</h2>
        <div className="space-y-3">
          {data.topServices?.map((service: any, index: number) => (
            <div key={service.serviceId || index} className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 p-3">
              <div>
                <p className="font-medium text-stone-900">{service.serviceName}</p>
                <p className="text-xs text-stone-500">{service.count} การจอง</p>
              </div>
              <p className="text-sm font-semibold text-emerald-700">
                {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(service.revenue || 0)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Branch Report Component
function BranchReport({ data }: { data: ReportData }) {
  if (!data.branches || data.branches.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-8 text-center">
        <Icon icon="solar:buildings-3-bold" className="mx-auto h-12 w-12 text-stone-400" />
        <p className="mt-4 text-sm font-medium text-stone-600">ไม่มีข้อมูลสาขาในช่วงเวลาที่เลือก</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">สาขา</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">การจองทั้งหมด</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">รายได้</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">รอยืนยัน</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">ยืนยันแล้ว</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">เสร็จสิ้น</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">ยกเลิก</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {data.branches?.map((branch: any, index: number) => (
              <tr key={branch.branchId || index} className="hover:bg-stone-50">
                <td className="px-4 py-3 text-sm font-medium text-stone-900">{branch.branchName}</td>
                <td className="px-4 py-3 text-sm text-stone-700">{branch.totalBookings}</td>
                <td className="px-4 py-3 text-sm font-semibold text-emerald-700">
                  {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(branch.totalRevenue || 0)}
                </td>
                <td className="px-4 py-3 text-sm text-stone-600">{branch.pending}</td>
                <td className="px-4 py-3 text-sm text-blue-600">{branch.confirmed}</td>
                <td className="px-4 py-3 text-sm text-emerald-600">{branch.completed}</td>
                <td className="px-4 py-3 text-sm text-rose-600">{branch.cancelled}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Service Report Component
function ServiceReport({ data }: { data: ReportData }) {
  if (!data.services || data.services.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-8 text-center">
        <Icon icon="solar:heart-pulse-bold" className="mx-auto h-12 w-12 text-stone-400" />
        <p className="mt-4 text-sm font-medium text-stone-600">ไม่มีข้อมูลบริการในช่วงเวลาที่เลือก</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">บริการ</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">การจองทั้งหมด</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">รายได้รวม</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">ราคาเฉลี่ย</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {data.services?.map((service: any, index: number) => (
              <tr key={service.serviceId || index} className="hover:bg-stone-50">
                <td className="px-4 py-3 text-sm font-medium text-stone-900">{service.serviceName}</td>
                <td className="px-4 py-3 text-sm text-stone-700">{service.totalBookings}</td>
                <td className="px-4 py-3 text-sm font-semibold text-emerald-700">
                  {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(service.totalRevenue || 0)}
                </td>
                <td className="px-4 py-3 text-sm text-stone-600">
                  {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(service.avgPrice || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Staff Report Component
function StaffReport({ data }: { data: ReportData }) {
  if (!data.staff || data.staff.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-8 text-center">
        <Icon icon="solar:users-group-rounded-bold" className="mx-auto h-12 w-12 text-stone-400" />
        <p className="mt-4 text-sm font-medium text-stone-600">ไม่มีข้อมูลพนักงานในช่วงเวลาที่เลือก</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">พนักงาน</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">การจองทั้งหมด</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">รายได้รวม</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">เสร็จสิ้น</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {data.staff?.map((staff: any, index: number) => (
              <tr key={staff.staffId || index} className="hover:bg-stone-50">
                <td className="px-4 py-3 text-sm font-medium text-stone-900">{staff.staffName}</td>
                <td className="px-4 py-3 text-sm text-stone-700">{staff.totalBookings}</td>
                <td className="px-4 py-3 text-sm font-semibold text-emerald-700">
                  {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(staff.totalRevenue || 0)}
                </td>
                <td className="px-4 py-3 text-sm text-emerald-600">{staff.completed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Customer Report Component
function CustomerReport({ data }: { data: ReportData }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">ชื่อ</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">เบอร์โทร</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">การจองทั้งหมด</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">รายได้รวม</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">การจองล่าสุด</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {data.customers?.map((customer: any, index: number) => (
              <tr key={index} className="hover:bg-stone-50">
                <td className="px-4 py-3 text-sm font-medium text-stone-900">{customer.name}</td>
                <td className="px-4 py-3 text-sm text-stone-700">{customer.phone}</td>
                <td className="px-4 py-3 text-sm text-stone-700">{customer.totalBookings}</td>
                <td className="px-4 py-3 text-sm font-semibold text-emerald-700">
                  {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(customer.totalRevenue || 0)}
                </td>
                <td className="px-4 py-3 text-sm text-stone-600">
                  {new Date(customer.lastBookingDate).toLocaleDateString('th-TH')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Time Report Component
function TimeReport({ data }: { data: ReportData }) {
  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

  return (
    <div className="space-y-6">
      {/* Bookings by Hour */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-stone-800">การจองตามชั่วโมง</h2>
        <div className="space-y-2">
          {data.bookingsByHour?.map((item: any) => (
            <div key={item.hour} className="flex items-center gap-4">
              <div className="w-16 text-sm font-medium text-stone-700">{item.hour}:00</div>
              <div className="flex-1">
                <div className="h-6 rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-primary-600"
                    style={{
                      width: `${Math.min((item.count / Math.max(...(data.bookingsByHour || []).map((h: any) => h.count), 1)) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="w-12 text-right text-sm font-semibold text-stone-900">{item.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bookings by Day of Week */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-stone-800">การจองตามวันในสัปดาห์</h2>
        <div className="space-y-2">
          {data.bookingsByDayOfWeek?.map((item: any) => (
            <div key={item.dayOfWeek} className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium text-stone-700">{dayNames[item.dayOfWeek - 1] || `วัน ${item.dayOfWeek}`}</div>
              <div className="flex-1">
                <div className="h-6 rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-emerald-600"
                    style={{
                      width: `${Math.min((item.count / Math.max(...(data.bookingsByDayOfWeek || []).map((d: any) => d.count), 1)) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="w-12 text-right text-sm font-semibold text-stone-900">{item.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Status Report Component
function StatusReport({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.statuses?.map((status: any) => (
          <div key={status.status} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-stone-500">{getStatusText(status.status)}</p>
            <p className="mt-2 text-3xl font-bold text-stone-900">{status.count}</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(status.revenue || 0)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function
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
