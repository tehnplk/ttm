'use client';

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

type TimeSlot = {
  id?: number;
  branchId: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
};

type Branch = {
  id: string;
  code: string;
  name: string;
};

export default function AdminOpeningHoursPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [newSlot, setNewSlot] = useState({ startTime: "08:30", endTime: "09:30" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Update existing slot
  function handleSlotChange(index: number, field: "startTime" | "endTime", value: string) {
    const normalized = value.replace(/\./g, ":");
    setTimeSlots((prev) =>
      prev.map((slot, i) =>
        i === index ? { ...slot, [field]: normalized } : slot
      )
    );
  }

  // Load branches
  async function loadBranches() {
    try {
      const res = await fetch("/api/admin/branches");
      const data = await res.json();
      if (res.ok && data.branches) {
        setBranches(data.branches.map((b: any) => ({
          id: String(b.id),
          code: b.code || String(b.id),
          name: b.name
        })));
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  }

  // Load time slots
  async function loadTimeSlots() {
    if (!selectedBranchId) {
      setTimeSlots([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/admin/opening-hours?branchId=${selectedBranchId}`);
      const data = await res.json();
      if (res.ok && data.timeSlots) {
        setTimeSlots(data.timeSlots);
      } else {
        setTimeSlots([]);
      }
    } catch (err) {
      console.error("Failed to load time slots:", err);
      setError("โหลดข้อมูลช่วงเวลาไม่สำเร็จ");
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function init() {
      await loadBranches();
      setLoading(false);
    }
    void init();
  }, []);

  useEffect(() => {
    void loadTimeSlots();
  }, [selectedBranchId]);

  // Add new time slot
  function handleAdd() {
    if (!selectedBranchId) {
      setError("กรุณาเลือกสาขาก่อน");
      return;
    }

    if (!newSlot.startTime || !newSlot.endTime) {
      setError("กรุณากรอกเวลาเริ่มต้นและเวลาสิ้นสุด");
      return;
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newSlot.startTime) || !timeRegex.test(newSlot.endTime)) {
      setError("รูปแบบเวลาไม่ถูกต้อง (ใช้รูปแบบ HH:mm เช่น 08:30)");
      return;
    }

    // Check if start time is before end time
    if (newSlot.startTime >= newSlot.endTime) {
      setError("เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด");
      return;
    }

    // Check for overlapping slots (only for same branch)
    const hasOverlap = timeSlots.some(slot => {
      return (
        slot.branchId === selectedBranchId &&
        (
          (newSlot.startTime >= slot.startTime && newSlot.startTime < slot.endTime) ||
          (newSlot.endTime > slot.startTime && newSlot.endTime <= slot.endTime) ||
          (newSlot.startTime <= slot.startTime && newSlot.endTime >= slot.endTime)
        )
      );
    });

    if (hasOverlap) {
      setError("ช่วงเวลานี้ซ้อนทับกับช่วงเวลาที่มีอยู่แล้ว");
      return;
    }

    setTimeSlots([...timeSlots, { ...newSlot, branchId: selectedBranchId }]);
    setNewSlot({ startTime: "08:30", endTime: "09:30" });
    setError(null);
  }

  // Delete time slot
  function handleDelete(index: number) {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  }

  // Save all time slots
  async function handleSave() {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      if (!selectedBranchId) {
        setError("กรุณาเลือกสาขาก่อน");
        return;
      }

      // Filter time slots for selected branch
      const branchTimeSlots = timeSlots.filter(slot => slot.branchId === selectedBranchId);

      // Validate slots before saving
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      for (let i = 0; i < branchTimeSlots.length; i++) {
        const slot = branchTimeSlots[i];
        if (!slot.startTime || !slot.endTime) {
          throw new Error("กรุณากรอกเวลาให้ครบทุกช่วง");
        }
        if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
          throw new Error("รูปแบบเวลาไม่ถูกต้อง (ใช้รูปแบบ HH:mm เช่น 08:30)");
        }
        if (slot.startTime >= slot.endTime) {
          throw new Error("เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด");
        }
      }

      // Check overlaps
      for (let i = 0; i < branchTimeSlots.length; i++) {
        for (let j = i + 1; j < branchTimeSlots.length; j++) {
          const a = branchTimeSlots[i];
          const b = branchTimeSlots[j];
          const overlap =
            (a.startTime >= b.startTime && a.startTime < b.endTime) ||
            (a.endTime > b.startTime && a.endTime <= b.endTime) ||
            (a.startTime <= b.startTime && a.endTime >= b.endTime);
          if (overlap) {
            throw new Error("พบช่วงเวลาซ้อนทับกัน กรุณาแก้ไขก่อนบันทึก");
          }
        }
      }

      const res = await fetch("/api/admin/opening-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeSlots: branchTimeSlots, branchId: selectedBranchId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "บันทึกข้อมูลช่วงเวลาไม่สำเร็จ");
      }

      setSuccess(true);
      await loadTimeSlots();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message ?? "บันทึกข้อมูลช่วงเวลาไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  // Format time for display (HH:mm format)
  function formatTimeForDisplay(time: string): string {
    if (!time) return '';
    return time; // Keep as HH:mm format
  }

  // Handle time input change — convert '.' to ':' for user convenience
  function handleTimeInputChange(value: string, field: 'startTime' | 'endTime') {
    const normalized = value.replace(/\./g, ':');
    setNewSlot({ ...newSlot, [field]: normalized });
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-stone-500">
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="mb-1 text-xl font-bold tracking-tight">
          ตั้งค่าเวลาเปิด-ปิด
        </h1>
        <p className="text-sm text-stone-500">
          กำหนดช่วงเวลาเปิด-ปิดสำหรับการจอง (แต่ละสาขาอาจมีช่วงเวลาไม่เหมือนกัน)
        </p>
      </div>

      {/* Branch selection */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-stone-700">
          สาขา <span className="text-rose-500">*</span>
        </label>
        <select
          required
          className="w-full max-w-xs rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          value={selectedBranchId}
          onChange={(e) => {
            setSelectedBranchId(e.target.value);
            setTimeSlots([]);
          }}
        >
          <option value="">-- เลือกสาขา --</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">
          บันทึกข้อมูลสำเร็จ
        </div>
      )}

      {/* Add new time slot */}
      {selectedBranchId && (
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="mb-3 text-sm font-medium text-stone-700">
            เพิ่มช่วงเวลาใหม่
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="00:00"
                value={newSlot.startTime || ''}
                onChange={(e) => handleTimeInputChange(e.target.value, 'startTime')}
                className="w-28 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <span className="text-stone-500">-</span>
              <input
                type="text"
                placeholder="00:00"
                value={newSlot.endTime || ''}
                onChange={(e) => handleTimeInputChange(e.target.value, 'endTime')}
                className="w-28 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors"
            >
              <Icon icon="solar:add-circle-bold" className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Time slots table */}
      {selectedBranchId && (
        <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
          <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-700">
                ลำดับ
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-700">
                ช่วงเวลา
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-stone-700">
                การจัดการ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {timeSlots.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-stone-500">
                  ยังไม่มีช่วงเวลา ลองกดปุ่ม "+" ด้านบนเพื่อเพิ่มช่วงเวลาใหม่
                </td>
              </tr>
            ) : (
              timeSlots.map((slot, index) => (
                <tr key={index} className="hover:bg-stone-50">
                  <td className="px-4 py-3 text-sm text-stone-700">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-stone-900">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={slot.startTime}
                        onChange={(e) => handleSlotChange(index, "startTime", e.target.value)}
                        className="w-24 rounded-lg border border-stone-300 px-2 py-1 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      />
                      <span className="text-stone-500">-</span>
                      <input
                        type="text"
                        value={slot.endTime}
                        onChange={(e) => handleSlotChange(index, "endTime", e.target.value)}
                        className="w-24 rounded-lg border border-stone-300 px-2 py-1 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(index)}
                      className="rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
                      title="ลบ"
                    >
                      <Icon icon="solar:trash-bin-trash-linear" className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      )}

      {!selectedBranchId && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-8 text-center text-sm text-stone-500">
          กรุณาเลือกสาขาเพื่อดูและจัดการช่วงเวลาเปิด-ปิด
        </div>
      )}

      {/* Save button */}
      {selectedBranchId && timeSlots.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon
              icon={submitting ? "solar:hourglass-line-bold" : "solar:check-circle-bold"}
              className="h-4 w-4"
            />
            {submitting ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
          </button>
        </div>
      )}
    </div>
  );
}
