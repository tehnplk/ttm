'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

interface BroadcastLog {
  id: number;
  imagePath: string;
  branchIds: string[];
  totalCount: number;
  sentCount: number;
  failedCount: number;
  isTest: boolean;
  sentAt: string | null;
}

interface Customer {
  lineId: string;
  name: string;
  phone: string;
  lastBookDate: string | null;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface Recipient {
  lineId: string;
  name: string;
  phone: string;
  success: boolean;
  sentAt: string | null;
}

// Format date time in Thai format (Buddhist era)
// Handle timezone correctly - API returns ISO string (UTC), but database stores local time
// We need to extract UTC components and treat them as local time
function formatThaiDateTime(dateString: string | null): string {
  if (!dateString) return '-';
  try {
    // Parse ISO string - extract UTC components and use them as local time
    // Example: "2025-12-12T22:14:09.000Z" -> treat 22:14:09 as local time
    const parsed = new Date(dateString);
    
    if (isNaN(parsed.getTime())) {
      return dateString;
    }
    
    // Get UTC components (which represent the actual local time stored in DB)
    // When DB stores "2025-12-12 22:14:09" and API converts to ISO "2025-12-12T22:14:09.000Z"
    // The UTC time is 22:14:09, which is what we want to display
    const year = parsed.getUTCFullYear();
    const month = parsed.getUTCMonth() + 1;
    const day = parsed.getUTCDate();
    const hours = parsed.getUTCHours();
    const minutes = parsed.getUTCMinutes();
    const seconds = parsed.getUTCSeconds();
    
    // Convert to Buddhist era
    const buddhistYear = year + 543;
    
    return `${day}/${month}/${buddhistYear} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return dateString;
  }
}

export default function BroadcastPage() {
  const [logs, setLogs] = useState<BroadcastLog[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showRecipients, setShowRecipients] = useState<number | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [showSendNow, setShowSendNow] = useState(false);
  const [sendNowBranchIds, setSendNowBranchIds] = useState<string[]>([]);
  const [sendNowImage, setSendNowImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);
  const [showTestSend, setShowTestSend] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState('');
  const [testImage, setTestImage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    loadLogs();
    loadBranches();
  }, []);

  async function loadRecipients(logId: number) {
    try {
      setLoadingRecipients(true);
      setError(null);
      const res = await fetch(`/api/admin/broadcasts/logs/${logId}/recipients`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถโหลดรายชื่อผู้รับได้');
      }
      setRecipients(data.recipients || []);
      setShowRecipients(logId);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดรายชื่อผู้รับได้');
      console.error('Load recipients error:', err);
    } finally {
      setLoadingRecipients(false);
    }
  }

  async function loadLogs() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/broadcasts/logs');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load broadcast logs');
      }
      setLogs(data.logs || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลได้');
      console.error('Load broadcast logs error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadBranches() {
    try {
      const res = await fetch('/api/admin/branches');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load branches');
      }
      setBranches(data.branches || []);
    } catch (err: any) {
      console.error('Load branches error:', err);
    }
  }

  function handleOpenSendNow() {
    setSendNowBranchIds([]);
    setSendNowImage('');
    setShowSendNow(true);
    setError(null);
    setSuccessMessage(null);
  }

  function toggleSendNowBranch(branchId: string) {
    setSendNowBranchIds((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    );
  }

  async function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    setImage: (url: string) => void,
  ) {
    const file = event.target.files?.[0];
    // Let the same file be picked again after a failed upload
    event.target.value = '';
    if (!file) return;

    // LINE only accepts JPEG/PNG, and the preview image must not exceed 1MB
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setError('LINE รองรับเฉพาะไฟล์ JPG หรือ PNG เท่านั้น');
      return;
    }

    if (file.size > 1024 * 1024) {
      setError('ขนาดไฟล์ต้องไม่เกิน 1MB');
      return;
    }

    try {
      setUploadingImage(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'broadcasts');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'อัปโหลดรูปภาพไม่สำเร็จ');
      }

      const data = await res.json();
      setImage(data.url);
    } catch (err: any) {
      setError(err.message || 'อัปโหลดรูปภาพไม่สำเร็จ');
      console.error('Image upload error:', err);
    } finally {
      setUploadingImage(false);
    }
  }

  function handleOpenTestSend() {
    setCustomerQuery('');
    setCustomers(null);
    setSelectedLineId('');
    setTestImage('');
    setShowTestSend(true);
    setError(null);
    setSuccessMessage(null);
  }

  async function handleSearchCustomers(event: React.FormEvent) {
    event.preventDefault();

    const query = customerQuery.trim();
    if (query.length < 2) {
      setError('กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร');
      return;
    }

    try {
      setSearchingCustomers(true);
      setError(null);
      setSelectedLineId('');

      const res = await fetch(`/api/admin/broadcasts/customers?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ค้นหาไม่สำเร็จ');
      }

      setCustomers(data.customers || []);
    } catch (err: any) {
      setError(err.message || 'ค้นหาไม่สำเร็จ');
      console.error('Search customers error:', err);
    } finally {
      setSearchingCustomers(false);
    }
  }

  async function handleTestSend() {
    if (!selectedLineId) {
      setError('กรุณาเลือกผู้รับ 1 คน');
      return;
    }

    if (!testImage) {
      setError('กรุณาเลือกรูปภาพที่ต้องการส่ง');
      return;
    }

    try {
      setSendingTest(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch('/api/admin/broadcasts/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineId: selectedLineId, imageUrl: testImage }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send test broadcast');
      }

      setShowTestSend(false);
      setSuccessMessage(
        data.sent > 0
          ? `ทดสอบส่งถึง ${data.name || 'ผู้รับ'} สำเร็จ`
          : `ทดสอบส่งถึง ${data.name || 'ผู้รับ'} ไม่สำเร็จ`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadLogs();
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถทดสอบส่งได้');
      console.error('Test send error:', err);
    } finally {
      setSendingTest(false);
    }
  }

  async function handleSendNow() {
    if (sendNowBranchIds.length === 0) {
      setError('กรุณาเลือกสาขาอย่างน้อย 1 สาขา');
      return;
    }

    if (!sendNowImage) {
      setError('กรุณาเลือกรูปภาพที่ต้องการส่ง');
      return;
    }

    if (!confirm('รูปภาพจะถูกส่งไปยังผู้ใช้ LINE ที่มีประวัติการจองภายใน 90 วันทันที และยกเลิกไม่ได้ ยืนยันหรือไม่?')) {
      return;
    }

    try {
      setSendingNow(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch('/api/admin/broadcasts/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchIds: sendNowBranchIds, imageUrl: sendNowImage }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send broadcast');
      }

      setShowSendNow(false);
      setSendNowBranchIds([]);
      setSendNowImage('');
      setSuccessMessage(
        data.failed > 0
          ? `ส่งรูปภาพสำเร็จ ${data.sent} คน ไม่สำเร็จ ${data.failed} คน (ทั้งหมด ${data.total} คน)`
          : `ส่งรูปภาพสำเร็จ ${data.sent} คน`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadLogs();
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถส่ง broadcast ได้');
      console.error('Send now error:', err);
    } finally {
      setSendingNow(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('ลบประวัติการส่งนี้ออกจากระบบ? (ไม่มีผลกับข้อความที่ส่งไปแล้ว)')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/broadcasts/logs/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete broadcast log');
      }

      setSuccessMessage('ลบประวัติการส่งสำเร็จ');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadLogs();
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถลบข้อมูลได้');
      console.error('Delete broadcast error:', err);
    }
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight">
            การส่ง Broadcast
          </h1>
          <p className="text-sm text-stone-500">
            ส่งรูปภาพไปยังผู้ใช้ LINE ตามสาขาที่เลือก
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenTestSend}
            className="flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
          >
            <Icon icon="solar:test-tube-bold" className="h-5 w-5" />
            <span>ทดสอบส่ง</span>
          </button>
          <button
            onClick={handleOpenSendNow}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Icon icon="solar:plain-bold" className="h-5 w-5" />
            <span>ส่งทันที</span>
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <div className="flex items-center gap-2">
            <Icon icon="solar:check-circle-bold" className="h-5 w-5" />
            <p className="font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && !showSendNow && !showTestSend && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <div className="flex items-center gap-2">
            <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Test Send Modal */}
      {showTestSend && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-4 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
            <div className="my-8 w-full max-w-2xl rounded-xl border border-stone-200 bg-white shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-200 p-5">
                <div>
                  <h2 className="text-base font-semibold text-stone-900">
                    ทดสอบส่งรูปภาพ
                  </h2>
                  <p className="mt-1 text-xs text-stone-500">
                    ค้นหาชื่อผู้รับ เลือกได้ 1 คน ระบบจะส่งเฉพาะคนที่เลือกเท่านั้น
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTestSend(false)}
                  className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100"
                >
                  <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 p-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-stone-700">
                    ค้นหาผู้รับ <span className="text-rose-500">*</span>
                  </label>
                  <form onSubmit={handleSearchCustomers} className="flex gap-2">
                    <input
                      type="text"
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      placeholder="กรอกชื่อ-นามสกุล..."
                    />
                    <button
                      type="submit"
                      disabled={searchingCustomers || sendingTest}
                      className="flex shrink-0 items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                    >
                      {searchingCustomers ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Icon icon="solar:magnifer-bold" className="h-4 w-4" />
                      )}
                      <span>ค้นหา</span>
                    </button>
                  </form>

                  {customers !== null && (
                    <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-stone-300">
                      {customers.length === 0 ? (
                        <p className="p-4 text-center text-sm text-stone-500">
                          ไม่พบผู้ที่มี LINE ตรงกับชื่อนี้
                        </p>
                      ) : (
                        <div className="divide-y divide-stone-100">
                          {customers.map((customer) => (
                            <label
                              key={customer.lineId}
                              className={`flex cursor-pointer items-start gap-3 p-3 transition-colors ${selectedLineId === customer.lineId
                                ? 'bg-primary-50'
                                : 'hover:bg-stone-50'
                                }`}
                            >
                              <input
                                type="radio"
                                name="test-recipient"
                                checked={selectedLineId === customer.lineId}
                                onChange={() => setSelectedLineId(customer.lineId)}
                                className="mt-1 h-4 w-4 shrink-0 text-primary-600 focus:ring-primary-500"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-semibold text-stone-900">
                                  {customer.name}
                                  {customer.phone && (
                                    <span className="ml-1 font-normal text-stone-500">
                                      ({customer.phone})
                                    </span>
                                  )}
                                </span>
                                {customer.lastBookDate && (
                                  <div className="mt-0.5 text-xs text-stone-500">
                                    จองล่าสุด {customer.lastBookDate}
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-stone-700">
                    รูปภาพ <span className="text-rose-500">*</span>
                  </label>

                  {!selectedLineId ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-200 bg-stone-50 px-4 py-8">
                      <Icon icon="solar:lock-keyhole-bold" className="h-8 w-8 text-stone-300" />
                      <span className="text-sm text-stone-400">เลือกผู้รับก่อนจึงจะเลือกรูปภาพได้</span>
                    </div>
                  ) : testImage ? (
                    <div className="relative inline-block">
                      <img
                        src={testImage}
                        alt="รูปภาพที่จะส่ง"
                        className="max-h-64 rounded-lg border border-stone-200 object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setTestImage('')}
                        disabled={sendingTest}
                        className="absolute -right-2 -top-2 rounded-full bg-rose-600 p-1 text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                        title="ลบรูปภาพ"
                      >
                        <Icon icon="solar:close-circle-bold" className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 px-4 py-8 transition-colors hover:border-primary-400 hover:bg-stone-50">
                      {uploadingImage ? (
                        <>
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-400 border-t-transparent"></div>
                          <span className="text-sm text-stone-500">กำลังอัปโหลด...</span>
                        </>
                      ) : (
                        <>
                          <Icon icon="solar:gallery-add-bold" className="h-8 w-8 text-stone-400" />
                          <span className="text-sm font-medium text-stone-600">คลิกเพื่อเลือกรูปภาพ</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(e) => handleImageUpload(e, setTestImage)}
                        disabled={uploadingImage || sendingTest}
                        className="sr-only"
                      />
                    </label>
                  )}

                  <p className="mt-1 text-xs text-stone-500">
                    รองรับเฉพาะไฟล์ JPG หรือ PNG ขนาดไม่เกิน 1MB (ข้อจำกัดของ LINE)
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-600">
                    {error}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-stone-200 p-5">
                <button
                  type="button"
                  onClick={() => setShowTestSend(false)}
                  disabled={sendingTest}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleTestSend}
                  disabled={sendingTest || uploadingImage || !testImage || !selectedLineId}
                  className="flex items-center gap-2 rounded-lg bg-stone-900 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                >
                  {sendingTest ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>กำลังส่ง...</span>
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:test-tube-bold" className="h-4 w-4" />
                      <span>ทดสอบส่ง</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Now Modal */}
      {showSendNow && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-4 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
            <div className="my-8 w-full max-w-2xl rounded-xl border border-stone-200 bg-white shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-200 p-5">
                <div>
                  <h2 className="text-base font-semibold text-stone-900">
                    ส่งรูปภาพทันที
                  </h2>
                  <p className="mt-1 text-xs text-stone-500">
                    รูปภาพจะถูกส่งออกทันทีเมื่อกดปุ่มส่ง ไม่ต้องรอเวลาที่ตั้งไว้
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSendNow(false)}
                  className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100"
                >
                  <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 p-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-stone-700">
                    สาขา <span className="text-rose-500">*</span>
                  </label>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-stone-300 p-3">
                    {branches.length === 0 ? (
                      <p className="text-sm text-stone-500">กำลังโหลดสาขา...</p>
                    ) : (
                      <div className="space-y-2">
                        {branches.map((branch) => {
                          const branchIdStr = String(branch.id).trim();
                          const isChecked = sendNowBranchIds.includes(branchIdStr);

                          return (
                            <div
                              key={branch.id}
                              className="flex cursor-pointer items-center gap-2 rounded p-2 transition-colors hover:bg-stone-50"
                              onClick={() => toggleSendNowBranch(branchIdStr)}
                            >
                              <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${isChecked
                                ? 'border-primary-600 bg-primary-600'
                                : 'border-stone-300 bg-white'
                                }`}>
                                {isChecked && (
                                  <Icon icon="solar:check-bold" className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSendNowBranch(branchIdStr)}
                                onClick={(e) => e.stopPropagation()}
                                className="sr-only"
                                tabIndex={-1}
                              />
                              <span className="flex-1 select-none text-sm text-stone-700">{branch.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-stone-700">
                    รูปภาพ <span className="text-rose-500">*</span>
                  </label>

                  {sendNowBranchIds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-200 bg-stone-50 px-4 py-8">
                      <Icon icon="solar:lock-keyhole-bold" className="h-8 w-8 text-stone-300" />
                      <span className="text-sm text-stone-400">เลือกสาขาก่อนจึงจะเลือกรูปภาพได้</span>
                    </div>
                  ) : sendNowImage ? (
                    <div className="relative inline-block">
                      <img
                        src={sendNowImage}
                        alt="รูปภาพที่จะส่ง"
                        className="max-h-64 rounded-lg border border-stone-200 object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setSendNowImage('')}
                        disabled={sendingNow}
                        className="absolute -right-2 -top-2 rounded-full bg-rose-600 p-1 text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                        title="ลบรูปภาพ"
                      >
                        <Icon icon="solar:close-circle-bold" className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 px-4 py-8 transition-colors hover:border-primary-400 hover:bg-stone-50">
                      {uploadingImage ? (
                        <>
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-400 border-t-transparent"></div>
                          <span className="text-sm text-stone-500">กำลังอัปโหลด...</span>
                        </>
                      ) : (
                        <>
                          <Icon icon="solar:gallery-add-bold" className="h-8 w-8 text-stone-400" />
                          <span className="text-sm font-medium text-stone-600">คลิกเพื่อเลือกรูปภาพ</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(e) => handleImageUpload(e, setSendNowImage)}
                        disabled={uploadingImage || sendingNow}
                        className="sr-only"
                      />
                    </label>
                  )}

                  <p className="mt-1 text-xs text-stone-500">
                    รองรับเฉพาะไฟล์ JPG หรือ PNG ขนาดไม่เกิน 1MB (ข้อจำกัดของ LINE)
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-600">
                    {error}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-stone-200 p-5">
                <button
                  type="button"
                  onClick={() => setShowSendNow(false)}
                  disabled={sendingNow}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSendNow}
                  disabled={sendingNow || uploadingImage || !sendNowImage || sendNowBranchIds.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-stone-400"
                >
                  {sendingNow ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>กำลังส่ง...</span>
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:plain-bold" className="h-4 w-4" />
                      <span>ส่งทันที</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Broadcasts List */}
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">เวลาที่ส่ง</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">รูปภาพ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">สาขา</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">ผลการส่ง</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-stone-700">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-stone-400">
                    ยังไม่มีประวัติการส่ง
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const selectedBranches = branches.filter(b => log.branchIds?.includes(b.id));
                  return (
                    <tr key={log.id} className="hover:bg-stone-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-stone-900">
                        <div className="flex flex-col items-start gap-1">
                          <span>{formatThaiDateTime(log.sentAt)}</span>
                          {log.isTest && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              ทดสอบ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <img
                          src={log.imagePath}
                          alt="รูปภาพที่ส่ง"
                          className="h-12 w-12 rounded border border-stone-200 object-cover"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-600">
                        {selectedBranches.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {selectedBranches.map((branch) => (
                              <span key={branch.id} className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700">
                                {branch.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-stone-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              สำเร็จ {log.sentCount}
                            </span>
                            {log.failedCount > 0 && (
                              <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                                ไม่สำเร็จ {log.failedCount}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-stone-500">
                            ทั้งหมด {log.totalCount} คน
                          </span>
                          <button
                            onClick={() => loadRecipients(log.id)}
                            className="text-xs text-primary-600 underline hover:text-primary-700"
                            title="ดูรายชื่อผู้รับ"
                          >
                            ดูรายชื่อผู้รับ
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="text-rose-600 hover:text-rose-700"
                            title="ลบ"
                          >
                            <Icon icon="solar:trash-bin-trash-bold" className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recipients Modal */}
      {showRecipients !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-stone-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">
                  รายชื่อผู้รับ Broadcast
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  รวม {recipients.length} คน
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRecipients(null);
                  setRecipients([]);
                }}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100"
              >
                <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
              </button>
            </div>

            {loadingRecipients ? (
              <div className="py-8 text-center text-sm text-stone-500">
                กำลังโหลด...
              </div>
            ) : recipients.length === 0 ? (
              <div className="py-8 text-center text-sm text-stone-500">
                ไม่พบรายชื่อผู้รับ
              </div>
            ) : (
              <div className="space-y-2">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-stone-700">ลำดับ</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-stone-700">ชื่อ</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-stone-700">เบอร์โทร</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-stone-700">ผล</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-stone-700">เวลาที่ส่ง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipients.map((recipient, index) => (
                        <tr key={recipient.lineId} className="border-b border-stone-100">
                          <td className="px-4 py-2 text-stone-600">{index + 1}</td>
                          <td className="px-4 py-2 text-stone-800">{recipient.name}</td>
                          <td className="px-4 py-2 text-stone-600 font-mono">{recipient.phone}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${recipient.success
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                                }`}
                            >
                              {recipient.success ? 'สำเร็จ' : 'ไม่สำเร็จ'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-stone-600">
                            {formatThaiDateTime(recipient.sentAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Icon icon="solar:info-circle-bold" className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="mb-2 text-sm font-semibold text-blue-900">วิธีใช้งาน</p>
            <ul className="space-y-1 text-xs text-blue-800">
              <li>• เลือกสาขาก่อน แล้วจึงเลือกรูปภาพที่ต้องการส่ง</li>
              <li>• รองรับเฉพาะไฟล์ JPG หรือ PNG ขนาดไม่เกิน 1MB ตามข้อจำกัดของ LINE</li>
              <li>• เมื่อกดส่งแล้วจะส่งออกทันทีและยกเลิกไม่ได้</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

