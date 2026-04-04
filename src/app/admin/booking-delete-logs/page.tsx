'use client';

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

type DeleteLogRow = {
  id: number;
  bookingId: number;
  customerName: string;
  customerPhone: string;
  bookDate: string | null;
  bookTime: string | null;
  staffId: number | null;
  staffName: string | null;
  branchId: number | null;
  branchName: string | null;
  serviceId: number | null;
  serviceName: string | null;
  deletedBy: string;
  deletedAt: string | null;
};

export default function AdminBookingDeleteLogsPage() {
  const [logs, setLogs] = useState<DeleteLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDeletedBy, setFilterDeletedBy] = useState<string>("");
  const [total, setTotal] = useState(0);

  async function loadLogs() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filterDeletedBy) {
        params.set('deletedBy', filterDeletedBy);
      }
      params.set('limit', '100');
      params.set('offset', '0');

      const res = await fetch(`/api/admin/booking-delete-logs?${params.toString()}`);
      const data = await res.json();
      
      if (res.ok) {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      } else {
        setError(data.error || "ไม่สามารถโหลด log ได้");
      }
    } catch (err: any) {
      setError(err.message ?? "ไม่สามารถโหลด log ได้");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, [filterDeletedBy]);

  // Get unique admin usernames for filter
  const uniqueAdmins = Array.from(new Set(logs.map(log => log.deletedBy))).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">ประวัติการลบการจอง</h1>
          <p className="mt-1 text-xs text-stone-500">
            ดูประวัติการลบการจองทั้งหมด ({total} รายการ)
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-stone-700 whitespace-nowrap">กรองตามผู้ลบ:</label>
          <select
            value={filterDeletedBy}
            onChange={(e) => setFilterDeletedBy(e.target.value)}
            className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 max-w-xs"
          >
            <option value="">-- ทั้งหมด --</option>
            {uniqueAdmins.map((admin) => (
              <option key={admin} value={admin}>
                {admin}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadLogs()}
            className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors"
          >
            <Icon icon="solar:refresh-linear" className="h-4 w-4" />
            รีเฟรช
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-stone-500">กำลังโหลด...</div>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center">
          <Icon icon="solar:document-text-linear" className="mx-auto h-12 w-12 text-stone-300" />
          <p className="mt-3 text-sm text-stone-500">ไม่มี log การลบการจอง</p>
        </div>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-700">วันที่/เวลาที่ลบ</th>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-700">ผู้ลบ</th>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-700">Booking ID</th>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-700">ลูกค้า</th>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-700">เบอร์โทร</th>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-700">วันที่จอง</th>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-700">เวลา</th>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-700">พนักงาน</th>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-700">สาขา</th>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-700">บริการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-stone-700 whitespace-nowrap">
                      {log.deletedAt
                        ? new Date(log.deletedAt).toLocaleString('th-TH', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-stone-900">
                      {log.deletedBy}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600 font-mono">
                      #{log.bookingId}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-700">
                      {log.customerName}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600 font-mono">
                      {log.customerPhone}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-700">
                      {log.bookDate
                        ? new Date(log.bookDate).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-700">
                      {log.bookTime || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-700">
                      {log.staffName || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-700">
                      {log.branchName || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-700">
                      {log.serviceName || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}












