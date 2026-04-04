'use client';

import { useEffect, useState } from "react";
import { Button } from "@heroui/react";

type StaffRow = {
  id: string;
  name: string;
  role: string;
  image: string;
  specialty: string;
};

type StaffFormState = {
  name: string;
  role: string;
  image: string;
  specialty: string;
};

export default function BackofficeStaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<StaffFormState>({
    name: "",
    role: "หมอนวดแผนไทย",
    image: "",
    specialty: "",
  });

  async function loadStaff() {
    try {
      setLoading(true);
      const res = await fetch("/api/backoffice/staff");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "โหลดข้อมูลพนักงานไม่สำเร็จ");
      }
      setStaff(data.staff ?? []);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "โหลดข้อมูลพนักงานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStaff();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim()) {
      setError("กรุณากรอกชื่อและตำแหน่งพนักงาน");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch("/api/backoffice/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "บันทึกข้อมูลพนักงานไม่สำเร็จ");
      }

      setForm((prev) => ({
        ...prev,
        name: "",
        image: "",
        specialty: "",
      }));
      await loadStaff();
    } catch (err: any) {
      setError(err.message ?? "บันทึกข้อมูลพนักงานไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-bold tracking-tight">จัดการพนักงาน</h1>
          <p className="text-sm text-stone-500">
            ดูรายการพนักงานทั้งหมด และเพิ่มพนักงานใหม่ผ่านฟอร์มในหน้าต่าง Modal
          </p>
        </div>
        <Button radius="lg">Large</Button>
      </div>

      {/* ตารางพนักงาน */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">รายการพนักงาน</h2>
          {loading && (
            <span className="text-[11px] text-stone-400">กำลังโหลด...</span>
          )}
        </div>

        {staff.length === 0 && !loading ? (
          <p className="text-sm text-stone-500">
            ยังไม่มีข้อมูลพนักงาน ลองกดปุ่ม &quot;เพิ่มพนักงาน&quot; ด้านบนขวา
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 text-[11px] uppercase text-stone-500">
                  <th className="px-3 py-2 text-left font-medium">ชื่อ</th>
                  <th className="px-3 py-2 text-left font-medium">ตำแหน่ง</th>
                  <th className="px-3 py-2 text-left font-medium">ความถนัด</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-stone-100 hover:bg-stone-50/80"
                  >
                    <td className="px-3 py-2 align-top">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-[11px] font-medium text-primary-700">
                          {s.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium text-stone-800">
                            {s.name}
                          </span>
                          {s.image && (
                            <span className="text-[10px] text-stone-400">
                              รูปภาพ: {s.image}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-[13px] text-stone-700">
                      {s.role}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-stone-600">
                      {s.specialty || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal เพิ่มพนักงาน */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">เพิ่มพนักงานใหม่</h2>
                <p className="mt-1 text-xs text-stone-500">
                  กรอกข้อมูลขั้นต่ำคือชื่อและตำแหน่ง ส่วนรูปภาพและความถนัดสามารถกรอกทีหลังได้
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full px-2 py-1 text-xs text-stone-500 hover:bg-stone-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="block font-medium text-stone-700">
                  ชื่อพนักงาน
                </label>
                <input
                  className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-300"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="เช่น นางสาว กัญญารัตน์ ใจดี"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-stone-700">
                  ตำแหน่ง / บทบาท
                </label>
                <input
                  className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-300"
                  value={form.role}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, role: e.target.value }))
                  }
                  placeholder="เช่น หมอนวดแผนไทย, front desk"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-stone-700">
                  รูปภาพ (URL)
                </label>
                <input
                  className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-300"
                  value={form.image}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, image: e.target.value }))
                  }
                  placeholder="ใส่ลิงก์รูปภาพพนักงาน (ไม่บังคับ)"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-stone-700">
                  ความถนัด (specialty)
                </label>
                <textarea
                  className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-300"
                  rows={2}
                  value={form.specialty}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, specialty: e.target.value }))
                  }
                  placeholder="เช่น นวดไทย, นวดน้ำมัน (เก็บเป็นข้อความ/JSON ได้ในอนาคต)"
                />
              </div>

              {error && <p className="text-xs text-rose-600">{error}</p>}

              <div className="mt-2 flex items-center justify-end gap-2">
                <Button
                  variant="light"
                  size="sm"
                  radius="md"
                  className="text-xs font-medium text-stone-600"
                  onPress={() => setShowModal(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  variant="solid"
                  size="sm"
                  radius="md"
                  isDisabled={submitting}
                  className="bg-primary-600 text-xs font-medium text-white hover:bg-primary-700"
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึกพนักงาน"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

