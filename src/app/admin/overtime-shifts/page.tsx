'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { toISODateString } from "@/utils";
import { OVERTIME_ROUND_IDS, overtimeStartTimes, shiftKey } from "@/lib/overtime";

const WEEKDAYS = [
  { id: 1, label: "วันจันทร์" },
  { id: 2, label: "วันอังคาร" },
  { id: 3, label: "วันพุธ" },
  { id: 4, label: "วันพฤหัสบดี" },
  { id: 5, label: "วันศุกร์" },
];

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return addDays(d, -((d.getDay() + 6) % 7));
}

// "YYYY-MM-DD" from the URL → Monday of that week; anything else → this week
function parseWeek(value: string | null): Date {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
  return mondayOf(isNaN(d.getTime()) ? new Date() : d);
}

const fmtDayMonth = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
const fmtFull = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

type StaffRow = { id: number; name: string; employeeNumber: string | null };

// Same order as /admin/bookings: employee number, then Thai name
function byEmployeeNumber(a: StaffRow, b: StaffRow): number {
  const aNum = a.employeeNumber ? Number(a.employeeNumber) : 999999;
  const bNum = b.employeeNumber ? Number(b.employeeNumber) : 999999;
  return aNum !== bNum ? aNum - bNum : a.name.localeCompare(b.name, "th");
}
type RosterRow = { shifts: Set<string>; note: string };
type Roster = Record<number, RosterRow>;

const emptyRow = (): RosterRow => ({ shifts: new Set<string>(), note: "" });

const showError = (text: string) =>
  Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text, confirmButtonColor: "#1e293b" });

const toast = (icon: "success" | "info", title: string) =>
  Swal.fire({ toast: true, position: "top-end", icon, title, showConfirmButton: false, timer: 2500, timerProgressBar: true });

async function fetchRoster(week: string): Promise<Roster> {
  const res = await fetch(`/api/admin/overtime-shifts?week=${week}`);
  if (!res.ok) throw new Error("โหลดตารางเวรไม่สำเร็จ");
  const data = await res.json();
  const roster: Roster = {};
  for (const r of data.shifts ?? []) {
    roster[r.empId] = { shifts: new Set<string>(r.shifts ?? []), note: r.note ?? "" };
  }
  return roster;
}

function OvertimeShiftsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const weekStart = useMemo(() => parseWeek(searchParams.get("week")), [searchParams]);
  const weekKey = toISODateString(weekStart);
  const isThisWeek = weekKey === toISODateString(mondayOf(new Date()));

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [roster, setRoster] = useState<Roster>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Round column labels: start times of the slots marked นอกเวลา in ตั้งค่าเวลา
  const [roundTimes, setRoundTimes] = useState<string[]>([]);
  const ROUNDS = OVERTIME_ROUND_IDS.map((id) => ({ id, time: roundTimes[id - 1] ?? `รอบ ${id}` }));

  useEffect(() => {
    (async () => {
      try {
        // ponytail: labels from the first branch; per-branch rosters if a second branch gets overtime
        const branchRes = await fetch("/api/admin/branches");
        const branchId = branchRes.ok ? (await branchRes.json()).branches?.[0]?.id : null;
        if (!branchId) return;
        const hoursRes = await fetch(`/api/admin/opening-hours?branchId=${branchId}`);
        if (hoursRes.ok) setRoundTimes(overtimeStartTimes((await hoursRes.json()).timeSlots ?? []));
      } catch (err) {
        console.error("Failed to load overtime round times", err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/staff");
        if (!res.ok) throw new Error("โหลดรายชื่อพนักงานไม่สำเร็จ");
        const data = await res.json();
        setStaff(
          (data.staff ?? [])
            .filter((e: any) => e.is_active !== "no")
            .map((e: any) => ({
              id: Number(e.id),
              name: `${e.prename || ""}${e.fname || ""} ${e.lname || ""}`.trim(),
              employeeNumber: e.employee_number || null,
            }))
            .sort(byEmployeeNumber),
        );
      } catch (err: any) {
        showError(err?.message ?? "โหลดข้อมูลไม่สำเร็จ");
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRoster(weekKey)
      .then((r) => {
        if (cancelled) return;
        setRoster(r);
        setDirty(false);
      })
      .catch((err) => {
        if (!cancelled) showError(err.message);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [weekKey]);

  const goToWeek = useCallback(
    async (monday: Date) => {
      if (dirty) {
        const { isConfirmed } = await Swal.fire({
          icon: "warning",
          title: "ยังไม่ได้บันทึกตารางเวร",
          text: "ต้องการเปลี่ยนสัปดาห์และทิ้งการแก้ไขหรือไม่?",
          showCancelButton: true,
          confirmButtonText: "เปลี่ยนสัปดาห์",
          cancelButtonText: "ยกเลิก",
          confirmButtonColor: "#1e293b",
        });
        if (!isConfirmed) return;
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("week", toISODateString(monday));
      // Native History API: updates the URL and useSearchParams in place, without a router navigation
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    },
    [dirty, pathname, searchParams],
  );

  const rowOf = (empId: number): RosterRow => roster[empId] ?? emptyRow();

  function updateRow(empId: number, change: (row: RosterRow) => RosterRow) {
    setRoster((prev) => ({ ...prev, [empId]: change(prev[empId] ?? emptyRow()) }));
    setDirty(true);
  }

  function toggle(empId: number, key: string) {
    updateRow(empId, (row) => {
      const shifts = new Set(row.shifts);
      if (shifts.has(key)) shifts.delete(key);
      else shifts.add(key);
      return { ...row, shifts };
    });
  }

  async function copyPreviousWeek() {
    try {
      const prev = await fetchRoster(toISODateString(addDays(weekStart, -7)));
      if (Object.keys(prev).length === 0) {
        Swal.fire({ icon: "info", title: "สัปดาห์ก่อนยังไม่มีตารางเวร", confirmButtonColor: "#1e293b" });
        return;
      }
      setRoster(prev);
      setDirty(true);
      toast("info", "คัดลอกจากสัปดาห์ก่อนแล้ว กดบันทึกเพื่อยืนยัน");
    } catch (err: any) {
      showError(err?.message ?? "คัดลอกไม่สำเร็จ");
    }
  }

  async function save() {
    setSaving(true);
    try {
      const payload = staff
        .map((s) => ({ empId: s.id, shifts: Array.from(rowOf(s.id).shifts), note: rowOf(s.id).note }))
        .filter((r) => r.shifts.length > 0 || r.note.trim());
      const res = await fetch("/api/admin/overtime-shifts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: weekKey, shifts: payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      }
      setDirty(false);
      toast("success", "บันทึกตารางเวรเรียบร้อย");
    } catch (err: any) {
      showError(err?.message ?? "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  const perSlotCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of staff) {
      for (const key of (roster[s.id] ?? emptyRow()).shifts) counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [staff, roster]);

  const cellClass = (round: number) => (round === 2 ? "bg-stone-50" : "");
  const navButton =
    "inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-stone-900">
          จัดการเวรปฏิบัติงานนอกเวลา (ช่วงเย็น) กมลาศรม
        </h2>
        <div className="flex items-center gap-3">
          <button type="button" onClick={copyPreviousWeek} disabled={loading} className={navButton}>
            <Icon icon="solar:copy-linear" className="h-4 w-4" />
            คัดลอกจากสัปดาห์ก่อน
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading || !dirty}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon icon={saving ? "svg-spinners:ring-resize" : "solar:diskette-linear"} className="h-4 w-4" />
            บันทึกตารางเวร
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => goToWeek(addDays(weekStart, -7))} className={navButton} aria-label="สัปดาห์ก่อน">
          <Icon icon="solar:alt-arrow-left-linear" className="h-4 w-4" />
          สัปดาห์ก่อน
        </button>
        <button type="button" onClick={() => goToWeek(mondayOf(new Date()))} disabled={isThisWeek} className={navButton}>
          สัปดาห์นี้
        </button>
        <button type="button" onClick={() => goToWeek(addDays(weekStart, 7))} className={navButton} aria-label="สัปดาห์ถัดไป">
          สัปดาห์ถัดไป
          <Icon icon="solar:alt-arrow-right-linear" className="h-4 w-4" />
        </button>
        <span className="ml-2 text-sm font-medium text-stone-800">
          {fmtDayMonth(weekStart)} - {fmtFull(addDays(weekStart, 4))}
        </span>
        {isThisWeek && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-200">
            สัปดาห์นี้
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-stone-500">กำลังโหลด...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-700">
              <tr>
                <th rowSpan={2} className="w-10 border-b border-r border-stone-200 px-2 py-2 text-center font-medium">#</th>
                <th rowSpan={2} className="min-w-[180px] border-b border-r border-stone-200 px-3 py-2 text-left font-medium">พนักงาน</th>
                {WEEKDAYS.map((d) => (
                  <th key={d.id} colSpan={ROUNDS.length} className="border-b border-r border-stone-200 px-2 py-1.5 text-center font-medium">
                    <div>{d.label}</div>
                    <div className="text-xs font-normal text-stone-500">{fmtDayMonth(addDays(weekStart, d.id - 1))}</div>
                  </th>
                ))}
                <th rowSpan={2} className="w-20 border-b border-r border-stone-200 px-2 py-2 text-center font-medium">
                  รวมเวร /<br />สัปดาห์
                </th>
                <th rowSpan={2} className="min-w-[120px] border-b border-stone-200 px-2 py-2 text-center font-medium">หมายเหตุ</th>
              </tr>
              <tr>
                {WEEKDAYS.map((d) =>
                  ROUNDS.map((r) => (
                    <th key={shiftKey(d.id, r.id)} className={`border-b border-r border-stone-200 px-1 py-1.5 text-center text-xs font-medium ${cellClass(r.id)}`}>
                      {r.time}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 && (
                <tr>
                  <td colSpan={4 + WEEKDAYS.length * ROUNDS.length} className="px-3 py-8 text-center text-stone-500">
                    ไม่มีพนักงาน
                  </td>
                </tr>
              )}
              {staff.map((s, idx) => {
                const row = rowOf(s.id);
                return (
                  <tr key={s.id} className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50/60">
                    <td className="border-r border-stone-200 px-2 py-2 text-center text-stone-600">{idx + 1}</td>
                    <td className="border-r border-stone-200 px-3 py-2 text-stone-800">{s.name}</td>
                    {WEEKDAYS.map((d) =>
                      ROUNDS.map((r) => {
                        const key = shiftKey(d.id, r.id);
                        return (
                          <td key={key} className={`border-r border-stone-200 px-1 py-2 text-center ${cellClass(r.id)}`}>
                            <input
                              type="checkbox"
                              checked={row.shifts.has(key)}
                              onChange={() => toggle(s.id, key)}
                              aria-label={`${s.name} ${d.label} ${r.time}`}
                              className="h-4 w-4 cursor-pointer rounded border-stone-300 accent-indigo-700"
                            />
                          </td>
                        );
                      }),
                    )}
                    <td className="border-r border-stone-200 px-2 py-2 text-center text-base font-semibold text-stone-800">
                      {row.shifts.size}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.note}
                        onChange={(e) => updateRow(s.id, (r) => ({ ...r, note: e.target.value }))}
                        maxLength={500}
                        placeholder="-"
                        className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-stone-700 focus:border-stone-300 focus:bg-white focus:outline-none"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-stone-50 text-stone-700">
              <tr>
                <td colSpan={2} className="border-t border-r border-stone-200 px-3 py-2 text-right font-medium">
                  รวมคนขึ้นเวรต่อรอบ
                </td>
                {WEEKDAYS.map((d) =>
                  ROUNDS.map((r) => (
                    <td key={shiftKey(d.id, r.id)} className={`border-t border-r border-stone-200 px-1 py-2 text-center text-xs ${cellClass(r.id)}`}>
                      {perSlotCount[shiftKey(d.id, r.id)] ?? 0} คน
                    </td>
                  )),
                )}
                <td className="border-t border-r border-stone-200" />
                <td className="border-t border-stone-200" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminOvertimeShiftsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-stone-500">กำลังโหลด...</div>}>
      <OvertimeShiftsContent />
    </Suspense>
  );
}
