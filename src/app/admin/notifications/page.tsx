'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

interface NotificationSettings {
  id: number | null;
  enabled: string;
  notificationTime: string;
  messageTemplate: string;
  daysBefore: number;
}

interface Recipient {
  id: number;
  bookingCode: string | null;
  bookerName: string;
  bookerTel: string | null;
  dateLabel: string;
  timeLabel: string;
  branchName: string | null;
  serviceName: string | null;
  status: string | null;
  lineId: string | null;
  lineIdValid: boolean;
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    id: null,
    enabled: 'yes',
    notificationTime: '09:00',
    messageTemplate: 'สวัสดีครับ คุณ{name} มีนัดในวันพรุ่งนี้ (วันที่ {date}) เวลา {time} ที่ {branch} กรุณามาตามเวลานัดหมาย',
    daysBefore: 1,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Test send picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/notifications');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load settings');
      }
      setSettings(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดการตั้งค่าได้');
      console.error('Load settings error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Validate time format
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(settings.notificationTime)) {
        throw new Error('รูปแบบเวลาไม่ถูกต้อง ต้องเป็น HH:mm (เช่น 09:00)');
      }

      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSettings(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถบันทึกการตั้งค่าได้');
      console.error('Save settings error:', err);
    } finally {
      setSaving(false);
    }
  }

  // Open the picker and load the bookings that match the current conditions
  async function openTestPicker() {
    setPickerOpen(true);
    setSelectedId(null);
    setTestResult(null);
    setTestError(null);
    setPickerError(null);
    setRecipients([]);
    setTargetDate(null);

    try {
      setPickerLoading(true);
      const res = await fetch(
        `/api/admin/notifications/recipients?daysBefore=${settings.daysBefore}`,
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถโหลดรายชื่อผู้รับได้');
      }
      setRecipients(data.recipients || []);
      setTargetDate(data.targetDate || null);
    } catch (err: any) {
      setPickerError(err?.message || 'ไม่สามารถโหลดรายชื่อผู้รับได้');
      console.error('Load recipients error:', err);
    } finally {
      setPickerLoading(false);
    }
  }

  // Send to the one selected person only
  async function handleTestSend() {
    if (!selectedId) return;

    try {
      setTesting(true);
      setTestResult(null);
      setTestError(null);

      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถส่งการแจ้งเตือนทดสอบได้');
      }

      if (data.sent > 0) {
        setTestResult(data.message || 'ส่งการแจ้งเตือนทดสอบเรียบร้อย');
      } else {
        setTestError(data.message || 'ไม่สามารถส่งการแจ้งเตือนทดสอบได้');
      }
      setPickerOpen(false);
    } catch (err: any) {
      const message = err?.message || 'ไม่สามารถส่งการแจ้งเตือนทดสอบได้';
      setTestError(message);
      setPickerOpen(false);
      console.error('Test send error:', err);
    } finally {
      setTesting(false);
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
      <div>
        <h1 className="mb-1 text-2xl font-bold tracking-tight">
          ตั้งค่าการแจ้งเตือนการถึงเวลานัด
        </h1>
        <p className="text-sm text-stone-500">
          ตั้งค่าเวลาและข้อความสำหรับแจ้งเตือนลูกค้าก่อนถึงเวลานัด
        </p>
        <p className="mt-1 text-xs text-stone-500">
          หลังบันทึกการตั้งค่า กรุณารอระบบรีเฟรชประมาณ 1 นาที
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <div className="flex items-center gap-2">
            <Icon icon="solar:check-circle-bold" className="h-5 w-5" />
            <p className="font-medium">บันทึกการตั้งค่าสำเร็จ</p>
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

      {/* Settings Form */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="space-y-6">
          {/* Enable/Disable */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-700">
              เปิด/ปิดการแจ้งเตือน
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="enabled"
                  value="yes"
                  checked={settings.enabled === 'yes'}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.value })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-stone-700">เปิดใช้งาน</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="enabled"
                  value="no"
                  checked={settings.enabled === 'no'}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.value })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-stone-700">ปิดใช้งาน</span>
              </label>
            </div>
          </div>

          {/* Notification Time */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-700">
              เวลาที่จะส่งการแจ้งเตือน <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              value={settings.notificationTime}
              onChange={(e) => setSettings({ ...settings, notificationTime: e.target.value })}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              required
            />
            <p className="mt-1 text-xs text-stone-500">
              ระบบจะส่งการแจ้งเตือนในเวลานี้ทุกวัน (รูปแบบ: HH:mm)
            </p>
          </div>

          {/* Days Before */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-700">
              จำนวนวันก่อนนัดที่จะแจ้งเตือน <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="7"
              value={settings.daysBefore}
              onChange={(e) => setSettings({ ...settings, daysBefore: parseInt(e.target.value) || 1 })}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              required
            />
            <p className="mt-1 text-xs text-stone-500">
              ระบุจำนวนวันก่อนถึงเวลานัดที่จะส่งการแจ้งเตือน (แนะนำ: 1 วัน)
            </p>
          </div>

          {/* Message Template - Hidden, using Flex Message instead */}
          <div className="hidden">
            <label className="mb-2 block text-sm font-semibold text-stone-700">
              ข้อความแจ้งเตือน <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={settings.messageTemplate}
              onChange={(e) => setSettings({ ...settings, messageTemplate: e.target.value })}
              rows={6}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 whitespace-pre-wrap"
              placeholder="กรุณากรอกข้อความแจ้งเตือน..."
              required
            />
          </div>
          
          {/* Info about Flex Message */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-2">
              <Icon icon="solar:info-circle-bold" className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">ระบบใช้ Flex Message อัตโนมัติ</p>
                <p className="text-xs text-blue-700">
                  ข้อความแจ้งเตือนจะแสดงเป็น Flex Message ที่สวยงามพร้อมรายละเอียดการจองครบถ้วน โดยไม่ต้องตั้งค่าข้อความแจ้งเตือน
                </p>
              </div>
            </div>
          </div>


          {/* Actions */}
          <div className="space-y-3 pt-4 border-t border-stone-200">
            {(testResult || testError) && (
              <div className={`rounded-lg border p-3 text-sm ${testResult ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                <div className="flex items-center gap-2">
                  <Icon icon={testResult ? 'solar:check-circle-bold' : 'solar:close-circle-bold'} className="h-4 w-4" />
                  <span>{testResult || testError}</span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <button
                onClick={openTestPicker}
                disabled={testing}
                className="flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-400 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {testing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-700 border-t-transparent"></div>
                    <span>กำลังทดสอบส่ง...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="solar:paper-plane-2-bold" className="h-4 w-4" />
                    <span>ทดสอบส่งตอนนี้</span>
                  </>
                )}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="solar:diskette-bold" className="h-4 w-4" />
                    <span>บันทึกการตั้งค่า</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Test Send Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  ทดสอบส่งการแจ้งเตือน
                </h2>
                <p className="mt-0.5 text-xs text-stone-500">
                  เลือกผู้รับได้ 1 คน ระบบจะส่ง LINE เฉพาะคนที่เลือกเท่านั้น
                </p>
              </div>
              <button
                onClick={() => setPickerOpen(false)}
                className="rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                aria-label="ปิด"
              >
                <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
              </button>
            </div>

            {/* Conditions used to build the list */}
            <div className="border-b border-stone-200 bg-stone-50 px-5 py-3 text-xs text-stone-600">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  แจ้งเตือนล่วงหน้า{' '}
                  <span className="font-semibold text-stone-900">
                    {settings.daysBefore} วัน
                  </span>
                </span>
                {targetDate && (
                  <span>
                    วันนัดที่เข้าเงื่อนไข:{' '}
                    <span className="font-semibold text-stone-900">{targetDate}</span>
                  </span>
                )}
              </div>
              {settings.enabled !== 'yes' && (
                <p className="mt-2 text-amber-700">
                  การแจ้งเตือนอัตโนมัติปิดอยู่ แต่การทดสอบส่งยังส่งได้ตามปกติ
                </p>
              )}
            </div>

            {/* Recipient list */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {pickerLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-stone-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-400 border-t-transparent"></div>
                  <span>กำลังโหลดรายชื่อ...</span>
                </div>
              ) : pickerError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {pickerError}
                </div>
              ) : recipients.length === 0 ? (
                <div className="py-10 text-center text-sm text-stone-500">
                  <Icon
                    icon="solar:inbox-line-duotone"
                    className="mx-auto mb-2 h-10 w-10 text-stone-300"
                  />
                  <p>ไม่มีรายการจองที่เข้าเงื่อนไขการแจ้งเตือน</p>
                  <p className="mt-1 text-xs">
                    (ต้องมี LINE ID และสถานะยังไม่ถูกยกเลิก)
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recipients.map((recipient) => (
                    <label
                      key={recipient.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        selectedId === recipient.id
                          ? 'border-primary-400 bg-primary-50'
                          : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="recipient"
                        checked={selectedId === recipient.id}
                        onChange={() => setSelectedId(recipient.id)}
                        className="mt-1 h-4 w-4 shrink-0 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2">
                          <span className="text-sm font-semibold text-stone-900">
                            {recipient.bookerName}
                            {recipient.bookerTel && (
                              <span className="ml-1 font-normal text-stone-500">
                                ({recipient.bookerTel})
                              </span>
                            )}
                          </span>
                          {recipient.bookingCode && (
                            <span className="text-[11px] text-stone-400">
                              {recipient.bookingCode}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-600">
                          <Icon
                            icon="solar:calendar-linear"
                            className="h-3.5 w-3.5 shrink-0 text-stone-400"
                          />
                          <span>
                            {recipient.dateLabel} เวลา {recipient.timeLabel}
                          </span>
                        </div>
                        {(recipient.branchName || recipient.serviceName) && (
                          <div className="mt-0.5 text-xs text-stone-500">
                            {[recipient.branchName, recipient.serviceName]
                              .filter(Boolean)
                              .join(' • ')}
                          </div>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                            <span className="font-semibold">LINE</span>
                            <span className="font-mono">{recipient.lineId}</span>
                          </span>
                          {!recipient.lineIdValid && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                              <Icon icon="solar:danger-triangle-bold" className="h-3 w-3" />
                              <span>รูปแบบ LINE ID ไม่ถูกต้อง</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-5 py-4">
              <button
                onClick={() => setPickerOpen(false)}
                disabled={testing}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleTestSend}
                disabled={testing || !selectedId}
                className="flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {testing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>กำลังส่ง...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="solar:paper-plane-2-bold" className="h-4 w-4" />
                    <span>ส่งให้คนที่เลือก</span>
                  </>
                )}
              </button>
            </div>
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
              <li>• ระบบจะส่งการแจ้งเตือนผ่าน LINE ไปยังลูกค้าที่มี LINE ID ในระบบ</li>
              <li>• การแจ้งเตือนจะส่งอัตโนมัติทุกวันตามเวลาที่ตั้งไว้</li>
              <li>• หลังบันทึกการตั้งค่า กรุณารอระบบรีเฟรชประมาณ 1 นาที</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

