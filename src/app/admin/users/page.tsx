'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface AdminUser {
  id: number;
  providerId: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  createdAt: string;
  profileData?: any;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [submitting, setSubmitting] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      
      // Check if response is ok and has content
      if (!res.ok) {
        let errorMessage = 'ไม่สามารถโหลดข้อมูลผู้ใช้งานได้';
        try {
          const errorText = await res.text();
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch {
              // Not JSON, use text as error message if it's short
              if (errorText.length < 200) {
                errorMessage = errorText;
              }
            }
          }
        } catch {
          // Ignore parsing errors
        }
        setError(errorMessage);
        return;
      }

      // Check content type
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Response is not JSON:', text.substring(0, 200));
        setError('ได้รับข้อมูลที่ไม่ถูกต้องจากเซิร์ฟเวอร์');
        return;
      }

      const text = await res.text();
      if (!text || text.trim() === '') {
        setError('ไม่พบข้อมูล');
        return;
      }

      const data = JSON.parse(text);
      setUsers(data.users || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error?.message || 'ไม่สามารถโหลดข้อมูลผู้ใช้งานได้');
    } finally {
      setLoading(false);
    }
  }

  async function updateUserStatus(userId: number, status: 'approved' | 'rejected') {
    try {
      setSubmitting(userId);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      // Check if response is ok
      if (!res.ok) {
        let errorMessage = 'เกิดข้อผิดพลาดในการอัปเดต';
        try {
          const errorText = await res.text();
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch {
              // Not JSON, use text as error message if it's short
              if (errorText.length < 200) {
                errorMessage = errorText;
              }
            }
          }
        } catch {
          // Ignore parsing errors
        }
        alert(errorMessage);
        return;
      }

      // Check content type
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Response is not JSON:', text.substring(0, 200));
        alert('ได้รับข้อมูลที่ไม่ถูกต้องจากเซิร์ฟเวอร์');
        return;
      }

      // Get response text and check if empty
      const text = await res.text();
      if (!text || text.trim() === '') {
        alert('ไม่ได้รับข้อมูลจากเซิร์ฟเวอร์');
        return;
      }

      // Parse JSON
      const data = JSON.parse(text);
      
      if (data.success) {
        await fetchUsers();
      } else {
        alert(data.error || data.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(error?.message || 'เกิดข้อผิดพลาดในการอัปเดต');
    } finally {
      setSubmitting(null);
    }
  }

  const filteredUsers = users.filter((user) => {
    if (filter === 'all') return true;
    return user.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">จัดการผู้ใช้งาน</h1>
        <p className="mt-1 text-sm text-slate-600">
          อนุมัติหรือปฏิเสธการสมัครสมาชิกของผู้ใช้งาน
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-stone-200">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === status
                ? 'border-b-2 border-stone-900 text-stone-900'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {status === 'all' && 'ทั้งหมด'}
            {status === 'pending' && 'รออนุมัติ'}
            {status === 'approved' && 'อนุมัติแล้ว'}
            {status === 'rejected' && 'ปฏิเสธ'}
            {status !== 'all' && (
              <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-xs">
                {users.filter((u) => u.status === status).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <div className="flex items-center gap-2">
            <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900"></div>
        </div>
      ) : error ? null : filteredUsers.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-12 text-center">
          <Icon icon="solar:user-id-bold" className="mx-auto h-12 w-12 text-stone-400" />
          <p className="mt-4 text-sm font-medium text-stone-900">ไม่พบผู้ใช้งาน</p>
          <p className="mt-1 text-xs text-stone-500">
            {filter === 'pending' && 'ไม่มีผู้ใช้งานที่รออนุมัติ'}
            {filter === 'approved' && 'ไม่มีผู้ใช้งานที่อนุมัติแล้ว'}
            {filter === 'rejected' && 'ไม่มีผู้ใช้งานที่ถูกปฏิเสธ'}
            {filter === 'all' && 'ไม่มีผู้ใช้งานในระบบ'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{user.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                        user.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : user.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {user.status === 'approved' && 'อนุมัติแล้ว'}
                      {user.status === 'pending' && 'รออนุมัติ'}
                      {user.status === 'rejected' && 'ปฏิเสธ'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-500">Provider ID:</span>{' '}
                      <span className="font-mono">{user.providerId}</span>
                    </div>
                    {user.email && (
                      <div>
                        <span className="text-slate-500">Email:</span>{' '}
                        <span className="truncate block">{user.email}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500">บทบาท:</span> {user.role}
                    </div>
                    <div>
                      <span className="text-slate-500">วันที่สมัคร:</span>{' '}
                      {new Date(user.createdAt).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                {user.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => updateUserStatus(user.id, 'approved')}
                      disabled={submitting === user.id}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:bg-stone-400 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {submitting === user.id ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          <span>กำลังดำเนินการ...</span>
                        </>
                      ) : (
                        <>
                          <Icon icon="solar:check-circle-bold" className="h-3.5 w-3.5" />
                          <span>อนุมัติ</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => updateUserStatus(user.id, 'rejected')}
                      disabled={submitting === user.id}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:bg-stone-400 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <Icon icon="solar:close-circle-bold" className="h-3.5 w-3.5" />
                      <span>ปฏิเสธ</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


