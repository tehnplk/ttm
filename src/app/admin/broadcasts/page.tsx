'use client';

import { useEffect, useState, useMemo } from 'react';
import { Icon } from '@iconify/react';

interface BroadcastSetting {
  id: number;
  broadcastDate: string;
  broadcastTime: string;
  message: string;
  branchIds: string[];
  enabled: string;
  sent: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export default function BroadcastSettingsPage() {
  const [broadcasts, setBroadcasts] = useState<BroadcastSetting[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showRecipients, setShowRecipients] = useState<number | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    broadcastDate: '',
    broadcastTime: '',
    message: '',
    branchIds: [] as string[],
    enabled: 'yes',
  });

  useEffect(() => {
    loadBroadcasts();
    loadBranches();
  }, []);

  async function loadRecipients(broadcastId: number) {
    try {
      setLoadingRecipients(true);
      setError(null);
      const res = await fetch(`/api/admin/broadcasts/${broadcastId}/recipients`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถโหลดรายชื่อผู้รับได้');
      }
      setRecipients(data.recipients || []);
      setShowRecipients(broadcastId);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดรายชื่อผู้รับได้');
      console.error('Load recipients error:', err);
    } finally {
      setLoadingRecipients(false);
    }
  }

  // Create a Set of checked branch IDs for faster lookup
  const checkedBranchIds = useMemo(() => {
    if (!Array.isArray(formData.branchIds)) {
      return new Set<string>();
    }
    const ids = formData.branchIds.map(id => String(id).trim()).filter(id => id.length > 0);
    return new Set(ids);
  }, [formData.branchIds]);


  async function loadBroadcasts() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/broadcasts');
      const data = await res.json();
      // console.log('=== LOAD BROADCASTS ===');
      // console.log('Data:', data);
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load broadcasts');
      }
      setBroadcasts(data.broadcasts || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลได้');
      console.error('Load broadcasts error:', err);
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

  function handleNewBroadcast() {
    setFormData({
      broadcastDate: '',
      broadcastTime: '',
      message: '',
      branchIds: [],
      enabled: 'yes',
    });
    setEditingId(null);
    setShowForm(true);
    setError(null);
    setSuccess(false);
  }

  function handleEdit(broadcast: BroadcastSetting) {
    // Ensure branchIds are strings for comparison
    // branchIds from database is already ["2","1"] format (string array)
    let branchIds: string[] = [];
    if (Array.isArray(broadcast.branchIds)) {
      // Already string array, just ensure all are strings
      branchIds = broadcast.branchIds.map(id => String(id).trim()).filter(id => id.length > 0);
    } else if (broadcast.branchIds) {
      // Handle case where branchIds might be a single value
      branchIds = [String(broadcast.branchIds).trim()].filter(id => id.length > 0);
    }
    // console.log('=== EDIT BROADCAST ===');
    // console.log('Original broadcast.branchIds:', broadcast.branchIds, typeof broadcast.branchIds);
    // console.log('Parsed branchIds:', branchIds);
    // console.log('Branches available:', branches.map(b => ({ id: b.id, idType: typeof b.id, name: b.name })));
    // console.log('Will check:', branchIds.map(id => ({ id, inBranches: branches.some(b => String(b.id) === id) })));

    setFormData({
      broadcastDate: broadcast.broadcastDate,
      broadcastTime: broadcast.broadcastTime,
      message: broadcast.message,
      branchIds: branchIds,
      enabled: broadcast.enabled,
    });
    setEditingId(broadcast.id);
    setShowForm(true);
    setError(null);
    setSuccess(false);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Validate
      if (!formData.broadcastDate || !formData.broadcastTime || !formData.message) {
        throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
      }

      // Ensure branchIds is an array and has at least one item
      const branchIds = Array.isArray(formData.branchIds) ? formData.branchIds : [];
      if (branchIds.length === 0) {
        throw new Error('กรุณาเลือกสาขาอย่างน้อย 1 สาขา');
      }

      // Validate time format
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(formData.broadcastTime)) {
        throw new Error('รูปแบบเวลาไม่ถูกต้อง ต้องเป็น HH:mm (เช่น 09:00)');
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.broadcastDate)) {
        throw new Error('รูปแบบวันที่ไม่ถูกต้อง ต้องเป็น YYYY-MM-DD');
      }

      // Ensure branchIds is properly formatted
      const submitData = {
        ...formData,
        branchIds: Array.isArray(formData.branchIds) ? formData.branchIds : [],
      };

      let res;
      if (editingId) {
        // Update
        res = await fetch(`/api/admin/broadcasts/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });
      } else {
        // Create
        res = await fetch('/api/admin/broadcasts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save broadcast');
      }

      setSuccess(true);
      setShowForm(false);
      setTimeout(() => setSuccess(false), 3000);
      await loadBroadcasts();
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถบันทึกข้อมูลได้');
      console.error('Save broadcast error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบการตั้งค่านี้?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/broadcasts/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete broadcast');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await loadBroadcasts();
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถลบข้อมูลได้');
      console.error('Delete broadcast error:', err);
    }
  }

  function handleToggleEnabled(broadcast: BroadcastSetting) {
    const newEnabled = broadcast.enabled === 'yes' ? 'no' : 'yes';
    setFormData({
      broadcastDate: broadcast.broadcastDate,
      broadcastTime: broadcast.broadcastTime,
      message: broadcast.message,
      branchIds: broadcast.branchIds || [],
      enabled: newEnabled,
    });
    setEditingId(broadcast.id);
    handleSave();
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
            ตั้งค่าส่ง Broadcast
          </h1>
          <p className="text-sm text-stone-500">
            ตั้งค่าวันที่ เวลา และข้อความสำหรับส่ง broadcast ผ่าน LINE
          </p>
        </div>
        <button
          onClick={handleNewBroadcast}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-800 flex items-center gap-2"
        >
          <Icon icon="solar:add-circle-bold" className="h-5 w-5" />
          <span>เพิ่มการตั้งค่า</span>
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <div className="flex items-center gap-2">
            <Icon icon="solar:check-circle-bold" className="h-5 w-5" />
            <p className="font-medium">บันทึกข้อมูลสำเร็จ</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <div className="flex items-center gap-2">
            <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-800">
              {editingId ? 'แก้ไขการตั้งค่า' : 'เพิ่มการตั้งค่าใหม่'}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-stone-400 hover:text-stone-600"
            >
              <Icon icon="solar:close-circle-bold" className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-stone-700">
                  วันที่ส่ง <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.broadcastDate}
                  onChange={(e) => setFormData({ ...formData, broadcastDate: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-stone-700">
                  เวลาส่ง <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.broadcastTime}
                  onChange={(e) => setFormData({ ...formData, broadcastTime: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-700">
                ข้อความ <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                placeholder="กรุณากรอกข้อความที่ต้องการส่ง..."
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-700">
                สาขา <span className="text-rose-500">*</span>
              </label>
              <div className="rounded-lg border border-stone-300 p-3 max-h-48 overflow-y-auto">
                {branches.length === 0 ? (
                  <p className="text-sm text-stone-500">กำลังโหลดสาขา...</p>
                ) : (
                  <div className="space-y-2">
                    {branches.map((branch) => {
                      const branchIdStr = String(branch.id).trim();
                      const isChecked = checkedBranchIds.has(branchIdStr);


                      const handleToggle = () => {
                        setFormData((prev) => {
                          const currentBranchIds = Array.isArray(prev.branchIds) ? [...prev.branchIds] : [];
                          const index = currentBranchIds.findIndex(id => String(id) === branchIdStr);

                          if (index >= 0) {
                            // Remove if exists
                            currentBranchIds.splice(index, 1);
                          } else {
                            // Add if not exists
                            currentBranchIds.push(branchIdStr);
                          }

                          return {
                            ...prev,
                            branchIds: currentBranchIds,
                          };
                        });
                      };

                      return (
                        <div
                          key={branch.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-stone-50 p-2 rounded transition-colors"
                          onClick={handleToggle}
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
                            onChange={handleToggle}
                            onClick={(e) => e.stopPropagation()}
                            className="sr-only"
                            tabIndex={-1}
                          />
                          <span className="text-sm text-stone-700 select-none flex-1">{branch.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-stone-500">
                เลือกสาขาที่ต้องการส่ง broadcast (สามารถเลือกได้หลายสาขา)
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-700">
                สถานะ
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="enabled"
                    value="yes"
                    checked={formData.enabled === 'yes'}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.value })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-stone-700">เปิดใช้งาน</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="enabled"
                    value="no"
                    checked={formData.enabled === 'no'}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.value })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-stone-700">ปิดใช้งาน</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-stone-900 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:bg-stone-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="solar:diskette-bold" className="h-4 w-4" />
                    <span>บันทึก</span>
                  </>
                )}
              </button>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">วันที่</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">เวลา</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">ข้อความ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">สาขา</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">สถานะ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">การส่ง</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-stone-700">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {broadcasts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-stone-400">
                    ยังไม่มีข้อมูลการตั้งค่า
                  </td>
                </tr>
              ) : (
                broadcasts.map((broadcast) => {
                  const selectedBranches = branches.filter(b => broadcast.branchIds?.includes(b.id));
                  return (
                    <tr key={broadcast.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 text-sm text-stone-900">
                        {new Date(broadcast.broadcastDate).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-900">{broadcast.broadcastTime}</td>
                      <td className="px-4 py-3 text-sm text-stone-600 max-w-xs truncate">
                        {broadcast.message}
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
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${broadcast.enabled === 'yes'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                            }`}
                        >
                          {broadcast.enabled === 'yes' ? 'เปิด' : 'ปิด'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {broadcast.sentAt ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                              ส่งแล้ว
                            </span>
                            <span className="text-xs text-stone-500">
                              {formatThaiDateTime(broadcast.sentAt)}
                            </span>
                            <button
                              onClick={() => loadRecipients(broadcast.id)}
                              className="mt-1 text-xs text-primary-600 hover:text-primary-700 underline"
                              title="ดูรายชื่อผู้รับ"
                            >
                              ดูรายชื่อผู้รับ
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-stone-100 text-stone-700">
                            ยังไม่ส่ง
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(broadcast)}
                            className="text-stone-900 hover:text-stone-700"
                            title="แก้ไข"
                          >
                            <Icon icon="solar:pen-bold" className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleToggleEnabled(broadcast)}
                            className={broadcast.enabled === 'yes' ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'}
                            title={broadcast.enabled === 'yes' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                          >
                            <Icon icon={broadcast.enabled === 'yes' ? 'solar:eye-closed-bold' : 'solar:eye-bold'} className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(broadcast.id)}
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
                        <th className="px-4 py-2 text-left text-xs font-semibold text-stone-700">เวลาที่ส่ง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipients.map((recipient, index) => (
                        <tr key={recipient.lineId} className="border-b border-stone-100">
                          <td className="px-4 py-2 text-stone-600">{index + 1}</td>
                          <td className="px-4 py-2 text-stone-800">{recipient.name}</td>
                          <td className="px-4 py-2 text-stone-600 font-mono">{recipient.phone}</td>
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
              <li>• สามารถตั้งค่าได้หลายเวลาใน 1 วัน</li>
              <li>• ระบบจะส่ง broadcast อัตโนมัติตามวันที่และเวลาที่ตั้งไว้</li>
              <li>• ระบบจะส่งข้อความไปยังทุก LINE user ที่มีในระบบ</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

