'use client';

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

type SettingsFormState = {
  id: string;
  bookingEnabled: string;
  bookingMessage: string;
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<SettingsFormState>({
    id: "",
    bookingEnabled: "yes",
    bookingMessage: "",
  });

  async function loadSettings() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "โหลดข้อมูลตั้งค่าไม่สำเร็จ");
      }
      setForm({
        id: data.id || "",
        bookingEnabled: data.bookingEnabled || "yes",
        bookingMessage: data.bookingMessage || "",
      });
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "โหลดข้อมูลตั้งค่าไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingEnabled: form.bookingEnabled,
          bookingMessage: form.bookingMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "บันทึกข้อมูลตั้งค่าไม่สำเร็จ");
      }

      setForm((prev) => ({ ...prev, id: data.id }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message ?? "บันทึกข้อมูลตั้งค่าไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="mb-1 text-xl font-bold tracking-tight">
          ตั้งค่าการจอง
        </h1>
        <p className="text-sm text-stone-500">
          ใช้สำหรับเปิด/ปิดการจองผ่านหน้า Booking และกำหนดข้อความแจ้งเตือน
        </p>
      </div>

      {loading ? (
        <div className="rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
          <div className="text-center text-sm text-stone-500">
            กำลังโหลดข้อมูล...
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2">
                <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-stone-300 text-primary-600 focus:ring-primary-500"
                    checked={form.bookingEnabled === "yes"}
                  onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        bookingEnabled: e.target.checked ? "yes" : "no",
                      }))
                  }
                />
                  <span className="text-sm font-medium text-stone-700">
                    เปิดใช้งานการจองผ่านหน้า Booking
                  </span>
                </label>
                <p className="text-xs text-stone-500 ml-6">
                  เมื่อปิดการใช้งาน ลูกค้าจะไม่สามารถจองผ่านหน้า Booking ได้
                </p>
            </div>

              {form.bookingEnabled === "no" && (
            <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-stone-700">
                    ข้อความแจ้งเตือนเมื่อปิดการจอง
              </label>
                  <textarea
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    rows={6}
                    value={form.bookingMessage}
                onChange={(e) =>
                      setForm((prev) => ({ ...prev, bookingMessage: e.target.value }))
                }
                    placeholder="ขณะนี้ระบบจองปิดปรับปรุง กรุณารอสักครู่ หรือติดต่อสอบถามที่เบอร์โทร..."
              />
                  <p className="text-xs text-stone-500">
                    ข้อความนี้จะแสดงให้ลูกค้าเห็นเมื่อการจองถูกปิดใช้งาน
              </p>
            </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-600">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-600">
                บันทึกข้อมูลตั้งค่าสำเร็จ
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon
                  icon={submitting ? "solar:hourglass-line-bold" : "solar:check-circle-bold"}
                  className="h-4 w-4"
                />
                {submitting ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
