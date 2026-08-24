'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

/**
 * Read a JSON response, tolerating the bodies that never reach our route
 * handlers. A reverse proxy answers 502/504/413 with its own HTML page, and
 * calling res.json() on that throws "Unexpected token '<'", which tells the
 * user nothing. Parse defensively and translate the status instead.
 */
async function readJson(res: Response): Promise<any> {
  const raw = await res.text();

  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    // Not JSON — an infrastructure error page, handled below
  }

  if (data && typeof data === 'object') {
    if (!res.ok) {
      throw new Error(data.error || `เซิร์ฟเวอร์ตอบกลับผิดพลาด (${res.status})`);
    }
    return data;
  }

  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new Error(
      'เซิร์ฟเวอร์ใช้เวลาตอบกลับนานเกินกำหนด คำสั่งอาจยังทำงานอยู่เบื้องหลัง กรุณารีเฟรชหน้าเพื่อตรวจสอบผลก่อนสั่งซ้ำ'
    );
  }

  if (res.status === 413) {
    throw new Error('ไฟล์มีขนาดใหญ่เกินกว่าที่เซิร์ฟเวอร์รับได้');
  }

  throw new Error(`เซิร์ฟเวอร์ตอบกลับในรูปแบบที่ไม่รองรับ (${res.status})`);
}

type BroadcastMessageType = 'image' | 'text' | 'youtube';

interface BroadcastLog {
  id: number;
  messageType: BroadcastMessageType;
  imagePath: string;
  messageText: string;
  videoUrl: string;
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

interface SendProgress {
  id: number;
  total: number;
  sent: number;
  failed: number;
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

const MESSAGE_TYPES: Array<{ value: BroadcastMessageType; label: string; icon: string }> = [
  { value: 'image', label: 'รูปภาพ', icon: 'solar:gallery-bold' },
  { value: 'text', label: 'ข้อความ', icon: 'solar:chat-round-line-bold' },
  { value: 'youtube', label: 'YouTube', icon: 'mdi:youtube' },
];

// LINE rejects a text message longer than this
const MAX_TEXT_LENGTH = 5000;

// Mirrors parseYoutubeId() in src/lib/line-broadcast.ts, so the composer can
// show the thumbnail before the link is ever sent to the server.
function parseYoutubeId(rawUrl: string): string | null {
  const url = rawUrl.trim();
  if (!url) return null;

  const patterns = [
    /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{11})/i,
    /^https?:\/\/(?:www\.)?youtu\.be\/([\w-]{11})/i,
    /^https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:shorts|embed|live|v)\/([\w-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// Short label for what a broadcast carried, used in the history table
function messageTypeLabel(type: BroadcastMessageType): string {
  return MESSAGE_TYPES.find((item) => item.value === type)?.label || 'รูปภาพ';
}

interface MessageComposerProps {
  type: BroadcastMessageType;
  onTypeChange: (type: BroadcastMessageType) => void;
  image: string;
  onImageChange: (image: string) => void;
  text: string;
  onTextChange: (text: string) => void;
  videoUrl: string;
  onVideoUrlChange: (videoUrl: string) => void;
  onImageUpload: (
    event: React.ChangeEvent<HTMLInputElement>,
    setImage: (url: string) => void,
  ) => void;
  uploading: boolean;
  /** A send is in flight — everything is read-only */
  sending: boolean;
  /** Recipients have not been chosen yet, so there is nothing to compose for */
  locked: boolean;
  lockedMessage: string;
}

/**
 * The content half of both modals: pick image / text / YouTube, then fill in
 * whatever that type needs. Shared so the two send flows cannot drift apart.
 */
function MessageComposer({
  type,
  onTypeChange,
  image,
  onImageChange,
  text,
  onTextChange,
  videoUrl,
  onVideoUrlChange,
  onImageUpload,
  uploading,
  sending,
  locked,
  lockedMessage,
}: MessageComposerProps) {
  const videoId = parseYoutubeId(videoUrl);
  const disabled = sending || uploading;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-semibold text-stone-700">
          ประเภทเนื้อหา <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {MESSAGE_TYPES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onTypeChange(item.value)}
              disabled={sending}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${type === item.value
                ? 'border-primary-600 bg-primary-50 text-primary-700'
                : 'border-stone-300 text-stone-600 hover:bg-stone-50'
                }`}
            >
              <Icon icon={item.icon} className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {locked ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-200 bg-stone-50 px-4 py-8">
          <Icon icon="solar:lock-keyhole-bold" className="h-8 w-8 text-stone-300" />
          <span className="text-sm text-stone-400">{lockedMessage}</span>
        </div>
      ) : type === 'image' ? (
        <div>
          <label className="mb-2 block text-sm font-semibold text-stone-700">
            รูปภาพ <span className="text-rose-500">*</span>
          </label>

          {image ? (
            <div className="relative inline-block">
              <img
                src={image}
                alt="รูปภาพที่จะส่ง"
                className="max-h-64 rounded-lg border border-stone-200 object-contain"
              />
              <button
                type="button"
                onClick={() => onImageChange('')}
                disabled={sending}
                className="absolute -right-2 -top-2 rounded-full bg-rose-600 p-1 text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                title="ลบรูปภาพ"
              >
                <Icon icon="solar:close-circle-bold" className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 px-4 py-8 transition-colors hover:border-primary-400 hover:bg-stone-50">
              {uploading ? (
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
                onChange={(e) => onImageUpload(e, onImageChange)}
                disabled={disabled}
                className="sr-only"
              />
            </label>
          )}

          <p className="mt-1 text-xs text-stone-500">
            รองรับเฉพาะไฟล์ JPG หรือ PNG ขนาดไม่เกิน 1MB (ข้อจำกัดของ LINE)
          </p>
        </div>
      ) : type === 'text' ? (
        <div>
          <label className="mb-2 block text-sm font-semibold text-stone-700">
            ข้อความ <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value.slice(0, MAX_TEXT_LENGTH))}
            disabled={sending}
            rows={6}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:bg-stone-50"
            placeholder="พิมพ์ข้อความที่ต้องการส่งถึงผู้ใช้ LINE..."
          />
          <p className="mt-1 text-xs text-stone-500">
            {text.length}/{MAX_TEXT_LENGTH} ตัวอักษร
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-700">
              ลิงก์ YouTube <span className="text-rose-500">*</span>
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => onVideoUrlChange(e.target.value)}
              disabled={sending}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:bg-stone-50"
              placeholder="https://www.youtube.com/watch?v=xxxxxxxxxxx"
            />

            {videoId ? (
              <div className="mt-3 flex items-start gap-3 rounded-lg border border-stone-200 p-3">
                <img
                  src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                  alt="ภาพตัวอย่างวิดีโอ"
                  className="h-20 w-28 shrink-0 rounded border border-stone-200 object-cover"
                />
                <div className="min-w-0 flex-1 text-xs text-stone-500">
                  <p className="mb-1 font-semibold text-stone-700">ตัวอย่างที่ผู้รับจะเห็น</p>
                  <p>ภาพหน้าปกวิดีโอ พร้อมปุ่ม &ldquo;ดูวิดีโอบน YouTube&rdquo;</p>
                </div>
              </div>
            ) : videoUrl.trim() ? (
              <p className="mt-1 text-xs text-rose-600">
                ลิงก์ YouTube ไม่ถูกต้อง ตัวอย่าง https://www.youtube.com/watch?v=xxxxxxxxxxx
              </p>
            ) : (
              <p className="mt-1 text-xs text-stone-500">
                รองรับลิงก์แบบ watch, youtu.be, shorts และ live
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-700">
              คำอธิบาย <span className="font-normal text-stone-400">(ไม่บังคับ)</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => onTextChange(e.target.value.slice(0, MAX_TEXT_LENGTH))}
              disabled={sending}
              rows={3}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:bg-stone-50"
              placeholder="ข้อความสั้น ๆ ที่แสดงใต้ภาพวิดีโอ..."
            />
          </div>
        </div>
      )}
    </div>
  );
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
  const [sendNowType, setSendNowType] = useState<BroadcastMessageType>('image');
  const [sendNowImage, setSendNowImage] = useState('');
  const [sendNowText, setSendNowText] = useState('');
  const [sendNowVideoUrl, setSendNowVideoUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);
  const [showTestSend, setShowTestSend] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState('');
  const [testType, setTestType] = useState<BroadcastMessageType>('image');
  const [testImage, setTestImage] = useState('');
  const [testText, setTestText] = useState('');
  const [testVideoUrl, setTestVideoUrl] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [progress, setProgress] = useState<SendProgress | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadLogs();
    loadBranches();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function loadRecipients(logId: number) {
    try {
      setLoadingRecipients(true);
      setError(null);
      const res = await fetch(`/api/admin/broadcasts/logs/${logId}/recipients`);
      const data = await readJson(res);
      setRecipients(data.recipients || []);
      setShowRecipients(logId);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดรายชื่อผู้รับได้');
      console.error('Load recipients error:', err);
    } finally {
      setLoadingRecipients(false);
    }
  }

  // `silent` keeps the progress poll from flipping the page back to its spinner
  async function loadLogs(options?: { silent?: boolean }): Promise<BroadcastLog[]> {
    try {
      if (!options?.silent) setLoading(true);
      const res = await fetch('/api/admin/broadcasts/logs');
      const data = await readJson(res);
      const nextLogs: BroadcastLog[] = data.logs || [];
      setLogs(nextLogs);
      setError(null);
      return nextLogs;
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลได้');
      console.error('Load broadcast logs error:', err);
      return [];
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }

  async function loadBranches() {
    try {
      const res = await fetch('/api/admin/branches');
      const data = await readJson(res);
      setBranches(data.branches || []);
    } catch (err: any) {
      console.error('Load branches error:', err);
    }
  }

  function handleOpenSendNow() {
    setSendNowBranchIds([]);
    setSendNowType('image');
    setSendNowImage('');
    setSendNowText('');
    setSendNowVideoUrl('');
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

      const data = await readJson(res);
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
    setTestType('image');
    setTestImage('');
    setTestText('');
    setTestVideoUrl('');
    setShowTestSend(true);
    setError(null);
    setSuccessMessage(null);
  }

  /**
   * The three content types each have their own required field. Returns the
   * request body when everything is filled in, or a Thai error message.
   */
  function buildMessageBody(
    type: BroadcastMessageType,
    image: string,
    text: string,
    videoUrl: string,
  ): { body?: Record<string, unknown>; error?: string } {
    if (type === 'image') {
      if (!image) return { error: 'กรุณาเลือกรูปภาพที่ต้องการส่ง' };
      return { body: { messageType: 'image', imageUrl: image } };
    }

    if (type === 'text') {
      if (!text.trim()) return { error: 'กรุณากรอกข้อความที่ต้องการส่ง' };
      return { body: { messageType: 'text', text: text.trim() } };
    }

    if (!videoUrl.trim()) return { error: 'กรุณากรอกลิงก์ YouTube ที่ต้องการส่ง' };
    if (!parseYoutubeId(videoUrl)) {
      return { error: 'ลิงก์ YouTube ไม่ถูกต้อง ตัวอย่าง https://www.youtube.com/watch?v=xxxxxxxxxxx' };
    }
    return { body: { messageType: 'youtube', videoUrl: videoUrl.trim(), text: text.trim() } };
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
      const data = await readJson(res);

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

    const { body, error: contentError } = buildMessageBody(
      testType,
      testImage,
      testText,
      testVideoUrl,
    );
    if (contentError || !body) {
      setError(contentError!);
      return;
    }

    try {
      setSendingTest(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch('/api/admin/broadcasts/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineId: selectedLineId, ...body }),
      });

      const data = await readJson(res);

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

    const { body, error: contentError } = buildMessageBody(
      sendNowType,
      sendNowImage,
      sendNowText,
      sendNowVideoUrl,
    );
    if (contentError || !body) {
      setError(contentError!);
      return;
    }

    if (!confirm('เนื้อหาจะถูกส่งไปยังผู้ใช้ LINE ที่มีประวัติการจองภายใน 90 วันทันที และยกเลิกไม่ได้ ยืนยันหรือไม่?')) {
      return;
    }

    try {
      setSendingNow(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch('/api/admin/broadcasts/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchIds: sendNowBranchIds, ...body }),
      });

      const data = await readJson(res);

      setShowSendNow(false);
      setSendNowBranchIds([]);
      setSendNowImage('');
      setSendNowText('');
      setSendNowVideoUrl('');
      await loadLogs({ silent: true });
      startProgressPolling(data.id, data.total ?? 0);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถส่ง broadcast ได้');
      console.error('Send now error:', err);
    } finally {
      setSendingNow(false);
    }
  }

  // The send itself runs in the background, so follow the log row until the
  // recipient counts add up to the total (or clearly stop moving).
  function startProgressPolling(logId: number, total: number) {
    stopProgressPolling();
    setProgress({ id: logId, total, sent: 0, failed: 0 });

    let lastDone = -1;
    let stalledPolls = 0;

    pollRef.current = setInterval(async () => {
      const nextLogs = await loadLogs({ silent: true });
      const log = nextLogs.find((item) => item.id === logId);
      if (!log) return;

      const done = log.sentCount + log.failedCount;
      setProgress({
        id: logId,
        total: log.totalCount,
        sent: log.sentCount,
        failed: log.failedCount,
      });

      if (done >= log.totalCount) {
        stopProgressPolling();
        setProgress(null);
        setSuccessMessage(
          log.failedCount > 0
            ? `ส่งสำเร็จ ${log.sentCount} คน ไม่สำเร็จ ${log.failedCount} คน (ทั้งหมด ${log.totalCount} คน)`
            : `ส่งสำเร็จ ${log.sentCount} คน`
        );
        setTimeout(() => setSuccessMessage(null), 8000);
        return;
      }

      // Nothing moved for ~2 minutes: stop polling rather than spin forever
      stalledPolls = done === lastDone ? stalledPolls + 1 : 0;
      lastDone = done;
      if (stalledPolls >= 40) {
        stopProgressPolling();
        setProgress(null);
        setError(
          `การส่งค้างอยู่ที่ ${done}/${log.totalCount} คน หยุดติดตามผลแล้ว กรุณารีเฟรชหน้าเพื่อตรวจสอบอีกครั้ง`
        );
      }
    }, 3000);
  }

  function stopProgressPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
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

      await readJson(res);

      setSuccessMessage('ลบประวัติการส่งสำเร็จ');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadLogs();
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถลบข้อมูลได้');
      console.error('Delete broadcast error:', err);
    }
  }

  // Whichever content type is selected, its required field must be filled in
  const testContentReady = !buildMessageBody(testType, testImage, testText, testVideoUrl).error;
  const sendNowContentReady = !buildMessageBody(
    sendNowType,
    sendNowImage,
    sendNowText,
    sendNowVideoUrl,
  ).error;

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
            ส่งรูปภาพ ข้อความ หรือคลิป YouTube ไปยังผู้ใช้ LINE ตามสาขาที่เลือก
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
            disabled={progress !== null}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-stone-400"
            title={progress !== null ? 'กำลังส่งชุดก่อนหน้าอยู่' : undefined}
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

      {/* Send Progress */}
      {progress && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            <p className="font-medium">
              กำลังส่ง {progress.sent + progress.failed} / {progress.total} คน
              {progress.failed > 0 && ` (ไม่สำเร็จ ${progress.failed} คน)`}
            </p>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${progress.total > 0
                  ? Math.min(100, Math.round(((progress.sent + progress.failed) / progress.total) * 100))
                  : 0}%`,
              }}
            ></div>
          </div>
          <p className="mt-2 text-xs text-blue-700">
            ระบบส่งอยู่เบื้องหลัง ปิดหน้านี้ได้ การส่งจะไม่หยุด
          </p>
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
                    ทดสอบส่งเนื้อหา
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

                <MessageComposer
                  type={testType}
                  onTypeChange={setTestType}
                  image={testImage}
                  onImageChange={setTestImage}
                  text={testText}
                  onTextChange={setTestText}
                  videoUrl={testVideoUrl}
                  onVideoUrlChange={setTestVideoUrl}
                  onImageUpload={handleImageUpload}
                  uploading={uploadingImage}
                  sending={sendingTest}
                  locked={!selectedLineId}
                  lockedMessage="เลือกผู้รับก่อนจึงจะกรอกเนื้อหาได้"
                />

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
                  disabled={sendingTest || uploadingImage || !testContentReady || !selectedLineId}
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
                    ส่งเนื้อหาทันที
                  </h2>
                  <p className="mt-1 text-xs text-stone-500">
                    เนื้อหาจะถูกส่งออกทันทีเมื่อกดปุ่มส่ง ไม่ต้องรอเวลาที่ตั้งไว้
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

                <MessageComposer
                  type={sendNowType}
                  onTypeChange={setSendNowType}
                  image={sendNowImage}
                  onImageChange={setSendNowImage}
                  text={sendNowText}
                  onTextChange={setSendNowText}
                  videoUrl={sendNowVideoUrl}
                  onVideoUrlChange={setSendNowVideoUrl}
                  onImageUpload={handleImageUpload}
                  uploading={uploadingImage}
                  sending={sendingNow}
                  locked={sendNowBranchIds.length === 0}
                  lockedMessage="เลือกสาขาก่อนจึงจะกรอกเนื้อหาได้"
                />

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
                  disabled={sendingNow || uploadingImage || !sendNowContentReady || sendNowBranchIds.length === 0}
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700">เนื้อหา</th>
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
                        <div className="flex max-w-xs items-start gap-2">
                          {log.messageType === 'image' && log.imagePath && (
                            <img
                              src={log.imagePath}
                              alt="รูปภาพที่ส่ง"
                              className="h-12 w-12 shrink-0 rounded border border-stone-200 object-cover"
                            />
                          )}
                          {log.messageType === 'youtube' && (
                            <img
                              src={`https://img.youtube.com/vi/${parseYoutubeId(log.videoUrl) || ''}/hqdefault.jpg`}
                              alt="ภาพหน้าปกวิดีโอ"
                              className="h-12 w-16 shrink-0 rounded border border-stone-200 object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                              {messageTypeLabel(log.messageType)}
                            </span>
                            {log.messageType === 'youtube' && log.videoUrl && (
                              <a
                                href={log.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 block truncate text-xs text-primary-600 underline hover:text-primary-700"
                                title={log.videoUrl}
                              >
                                {log.videoUrl}
                              </a>
                            )}
                            {log.messageText && (
                              <p className="mt-1 line-clamp-2 text-xs text-stone-600" title={log.messageText}>
                                {log.messageText}
                              </p>
                            )}
                          </div>
                        </div>
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
                          {log.sentCount + log.failedCount < log.totalCount && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600"></span>
                              กำลังส่ง
                            </span>
                          )}
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
              <li>• เลือกสาขาก่อน แล้วจึงเลือกประเภทเนื้อหา (รูปภาพ / ข้อความ / YouTube)</li>
              <li>• รูปภาพ: รองรับเฉพาะไฟล์ JPG หรือ PNG ขนาดไม่เกิน 1MB ตามข้อจำกัดของ LINE</li>
              <li>• ข้อความ: พิมพ์ได้ไม่เกิน {MAX_TEXT_LENGTH.toLocaleString()} ตัวอักษร</li>
              <li>• YouTube: วางลิงก์วิดีโอ ผู้รับจะเห็นภาพหน้าปกพร้อมปุ่มเปิดดูวิดีโอ</li>
              <li>• เมื่อกดส่งแล้วจะส่งออกทันทีและยกเลิกไม่ได้</li>
              <li>• ระบบส่งอยู่เบื้องหลัง ปิดหน้านี้ได้ กลับมาเปิดใหม่จะเห็นผลล่าสุดในตาราง</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

