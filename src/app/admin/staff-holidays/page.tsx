'use client';

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { toISODateString } from "@/utils";

type BranchOption = {
  id: string;
  code: string;
  name: string;
};

type StaffOption = {
  id: string;
  name: string;
  branchId: number | null;
};

type HolidayDate = {
  date: string; // YYYY-MM-DD
  isHoliday: boolean;
  holidayId?: string;
};

type HolidayRecord = {
  id: string;
  staffId: string;
  staffName: string;
  branchId: number | null;
  branchName?: string;
  holidayDate: string;
  note: string;
};

function AdminStaffHolidaysContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Branch + staff selection lives in the URL so the view is shareable and
  // survives a reload / back-forward navigation
  const selectedBranchId = searchParams.get("branchId") ?? "";
  const selectedStaffId = searchParams.get("staffId") ?? "";

  const setSelection = useCallback(
    (next: { branchId?: string; staffId?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      const query = params.toString();
      // Native History API: updates the URL and useSearchParams in place,
      // without a router navigation
      window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [pathname, searchParams],
  );

  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffOption[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [isStaffSearching, setIsStaffSearching] = useState(false);
  const [holidays, setHolidays] = useState<HolidayDate[]>([]);
  const [allHolidays, setAllHolidays] = useState<HolidayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [pendingDates, setPendingDates] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

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

  // Load staff
  async function loadStaff() {
    try {
      const res = await fetch("/api/admin/staff");
      if (!res.ok) {
        setStaff([]);
        return;
      }
      
      const data = await res.json();
      if (data.staff && Array.isArray(data.staff)) {
        const staffList = data.staff.map((e: any) => {
          const prename = e.prename || '';
          const fname = e.fname || '';
          const lname = e.lname || '';
          const fullName = `${prename}${fname} ${lname}`.trim();
          return {
            id: String(e.id),
            name: fullName || `พนักงาน #${e.id}`,
            branchId: e.branch_id
          };
        });
        setStaff(staffList);
      } else {
        setStaff([]);
      }
    } catch (err) {
      console.error("Failed to load staff:", err);
      setStaff([]);
    }
  }

  // Load holidays for selected staff
  async function loadHolidays() {
    if (!selectedStaffId) {
      setHolidays([]);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/admin/staff-holidays?staffId=${selectedStaffId}`);
      const data = await res.json();
      if (res.ok && data.holidays) {
        const holidayMap = new Map<string, string>();
        data.holidays.forEach((h: any) => {
          holidayMap.set(h.holidayDate, h.id);
        });
        generateMonthDates(holidayMap);
      } else {
        generateMonthDates(new Map());
      }
    } catch (err) {
      console.error("Failed to load holidays:", err);
      generateMonthDates(new Map());
    } finally {
      setLoading(false);
    }
  }

  // Generate dates for current month + 2 months ahead
  // Past dates are included too, but the calendar renders them read-only
  function generateMonthDates(holidayMap: Map<string, string>) {
    const dates: HolidayDate[] = [];

    // Generate dates for current month and next 2 months
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const now = new Date();
      const displayMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const year = displayMonth.getFullYear();
      const month = displayMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = toISODateString(new Date(year, month, day));
        const holidayId = holidayMap.get(dateStr);
        dates.push({
          date: dateStr,
          isHoliday: !!holidayId,
          holidayId: holidayId,
        });
      }
    }

    setHolidays(dates);
  }

  // Toggle holiday - optimistic update, saves to DB without reloading the calendar
  async function toggleHoliday(date: string) {
    if (!selectedStaffId) {
      setError("กรุณาเลือกพนักงานก่อน");
      return;
    }
    if (pendingDates.has(date)) return;

    // Past dates are read-only
    const todayStr = toISODateString(new Date());
    if (date < todayStr) return;

    const holiday = holidays.find(h => h.date === date);
    const isCurrentlyHoliday = holiday?.isHoliday || false;
    const previousHolidayId = holiday?.holidayId;

    const setDateState = (isHoliday: boolean, holidayId?: string) => {
      setHolidays(prev => prev.map(h => (
        h.date === date ? { ...h, isHoliday, holidayId } : h
      )));
    };
    const revert = () => setDateState(isCurrentlyHoliday, previousHolidayId);

    setError(null);
    setPendingDates(prev => new Set(prev).add(date));
    // Flip immediately so the switch responds without waiting for the server
    setDateState(!isCurrentlyHoliday, isCurrentlyHoliday ? undefined : previousHolidayId);

    try {
      // If trying to add holiday (turn OFF), check if staff has bookings on this date
      if (!isCurrentlyHoliday) {
        // Check if staff has bookings on this date
        try {
          const checkRes = await fetch(`/api/admin/bookings`);
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            const bookingsOnDate = checkData.bookings?.filter((b: any) => {
              // Check if booking is for this staff and date
              const bookingDate = typeof b.date === 'string' ? b.date.split('T')[0] : '';
              const isSameStaff = String(b.staffId) === String(selectedStaffId);
              const isSameDate = bookingDate === date;
              // Only count non-cancelled bookings
              const isActive = !b.status || (b.status !== 'cancelled');
              return isSameStaff && isSameDate && isActive;
            }) || [];

            if (bookingsOnDate.length > 0) {
              const staffName = filteredStaff.find(s => s.id === selectedStaffId)?.name || 'พนักงาน';
              const dateStr = new Date(date).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
              throw new Error(`${staffName} มีการจองในวันที่ ${dateStr} (${bookingsOnDate.length} รายการ) ไม่สามารถ OFF ได้`);
            }
          }
        } catch (checkErr: unknown) {
          // Only abort on our own validation error; ignore network failures of the check
          if (checkErr instanceof Error && checkErr.message.includes('ไม่สามารถ OFF ได้')) {
            throw checkErr;
          }
          console.error("Error checking bookings:", checkErr);
        }

        // Add holiday
        const res = await fetch("/api/admin/staff-holidays", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId: selectedStaffId,
            branchId: selectedBranchId ? parseInt(selectedBranchId) : null,
            holidayDate: date,
            note: "",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "บันทึกวันหยุดไม่สำเร็จ");
        }
        // Keep the id the server assigned so the next toggle can delete it
        setDateState(true, data.id ? String(data.id) : undefined);
      } else {
        // Remove holiday (turn ON) - always allowed
        if (previousHolidayId) {
          const res = await fetch(`/api/admin/staff-holidays/${previousHolidayId}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            throw new Error("ลบวันหยุดไม่สำเร็จ");
          }
        }
      }
    } catch (err: any) {
      revert();
      setError(err.message ?? "บันทึกวันหยุดไม่สำเร็จ");
    } finally {
      setPendingDates(prev => {
        const next = new Set(prev);
        next.delete(date);
        return next;
      });
    }
  }

  useEffect(() => {
    void loadBranches();
    void loadStaff();
  }, []);

  // Filter staff by branch. This must NOT clear the selection: it also runs when
  // the staff list finishes loading, which would wipe a staffId coming from the URL.
  useEffect(() => {
    if (!selectedBranchId) {
      setFilteredStaff(staff);
    } else {
      const branchIdNum = parseInt(selectedBranchId);
      setFilteredStaff(staff.filter(s => s.branchId === branchIdNum));
    }
  }, [selectedBranchId, staff]);

  // What the picker shows when the user is not typing: whoever the URL selects
  const selectedStaffName = staff.find(s => s.id === selectedStaffId)?.name ?? "";

  // Opening the picker always lists every staff in the branch: the previous
  // pick must not filter the list down to itself
  function openStaffDropdown() {
    setIsStaffSearching(false);
    setStaffSearchQuery("");
    setShowStaffDropdown(true);
  }

  // Changing branch drops the staff selected under the previous branch
  function handleBranchChange(branchId: string) {
    setSelection({ branchId, staffId: "" });
    setStaffSearchQuery("");
    setShowStaffDropdown(false);
    setIsStaffSearching(false);
    setHolidays([]);
  }


  // Load holidays when staff is selected
  useEffect(() => {
    void loadHolidays();
  }, [selectedStaffId]);

  // Load all holidays for list view
  async function loadAllHolidays() {
    try {
      setLoadingList(true);
      const params = new URLSearchParams();
      if (selectedBranchId) {
        params.set('branchId', selectedBranchId);
      }
      
      const res = await fetch(`/api/admin/staff-holidays?${params.toString()}`);
      const data = await res.json();
      
      if (res.ok && data.holidays) {
        // Sort by holiday date (ascending)
        const sorted = data.holidays.sort((a: HolidayRecord, b: HolidayRecord) => {
          return new Date(a.holidayDate).getTime() - new Date(b.holidayDate).getTime();
        });
        
        // Add branch names
        const holidaysWithBranch = sorted.map((h: HolidayRecord) => {
          const branch = branches.find(b => b.id === String(h.branchId));
          return {
            ...h,
            branchName: branch?.name || '-',
          };
        });
        
        setAllHolidays(holidaysWithBranch);
      } else {
        setAllHolidays([]);
      }
    } catch (err) {
      console.error("Failed to load all holidays:", err);
      setAllHolidays([]);
    } finally {
      setLoadingList(false);
    }
  }

  // Load all holidays when tab changes or branch changes
  useEffect(() => {
    if (activeTab === 'list') {
      void loadAllHolidays();
    }
  }, [activeTab, selectedBranchId, branches]);

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];


  return (
    <div className="space-y-4">
      <div>
        <h1 className="mb-1 text-xl font-bold tracking-tight">
          พนักงานลาหยุด
        </h1>
        <p className="text-sm text-stone-500">
          เลือกสาขาและพนักงานเพื่อบันทึกวันหยุด
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'calendar'
              ? 'border-b-2 border-stone-900 text-stone-900'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          ปฏิทิน
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'list'
              ? 'border-b-2 border-stone-900 text-stone-900'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          รายการวันหยุด
        </button>
      </div>

      {/* Selection */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-stone-700">
            สาขา
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => handleBranchChange(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="">-- เลือกสาขา --</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-stone-700">
            พนักงาน
          </label>
          <div className="relative">
            <input
              type="text"
              className="w-full rounded-lg border border-stone-300 py-2 pl-3 pr-8 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 cursor-pointer"
              placeholder="ค้นหาหรือเลือกพนักงาน..."
              value={isStaffSearching ? staffSearchQuery : selectedStaffName}
              onChange={(e) => {
                setStaffSearchQuery(e.target.value);
                setIsStaffSearching(true);
                setShowStaffDropdown(true);
                if (!e.target.value && selectedStaffId) {
                  setSelection({ staffId: "" });
                }
              }}
              onFocus={(e) => {
                openStaffDropdown();
                e.target.select();
              }}
              // The input keeps focus after a pick, so onFocus alone would never
              // fire again - clicking it must reopen the list on its own
              onClick={() => openStaffDropdown()}
              onBlur={() => {
                setTimeout(() => {
                  setShowStaffDropdown(false);
                  // Drop half-typed text: the box falls back to the URL selection
                  setIsStaffSearching(false);
                  setStaffSearchQuery("");
                }, 200);
              }}
              disabled={!selectedBranchId}
            />
            {selectedBranchId && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={showStaffDropdown ? "ปิดรายชื่อพนักงาน" : "เปิดรายชื่อพนักงาน"}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (showStaffDropdown) {
                    setShowStaffDropdown(false);
                  } else {
                    openStaffDropdown();
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <Icon
                  icon="solar:alt-arrow-down-linear"
                  className={`h-4 w-4 transition-transform ${showStaffDropdown ? "rotate-180" : ""}`}
                />
              </button>
            )}
            {showStaffDropdown && selectedBranchId && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-stone-200 bg-white shadow-lg">
                {filteredStaff.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-stone-500">
                    ไม่พบพนักงาน
                  </div>
                ) : (() => {
                  const filtered = isStaffSearching
                    ? filteredStaff.filter((s) =>
                        s.name.toLowerCase().includes(staffSearchQuery.toLowerCase())
                      )
                    : filteredStaff;
                  return filtered.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-stone-500">
                      ไม่พบพนักงาน
                    </div>
                  ) : (
                    filtered.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                          selectedStaffId === s.id
                            ? "bg-primary-50 text-primary-700"
                            : "text-stone-700 hover:bg-stone-50"
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelection({ staffId: s.id });
                          setStaffSearchQuery("");
                          setIsStaffSearching(false);
                          setShowStaffDropdown(false);
                        }}
                      >
                        {s.name || `พนักงาน #${s.id}`}
                      </button>
                    ))
                  );
                })()}
              </div>
            )}
            {selectedStaffId && (
              <input type="hidden" name="staffId" value={selectedStaffId} />
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* List View */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {loadingList ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900"></div>
            </div>
          ) : allHolidays.length === 0 ? (
            <div className="rounded-lg border border-stone-200 bg-white p-12 text-center">
              <Icon icon="solar:calendar-mark-linear" className="mx-auto h-12 w-12 text-stone-400" />
              <p className="mt-4 text-sm font-medium text-stone-900">ไม่พบวันหยุด</p>
              <p className="mt-1 text-xs text-stone-500">
                {selectedBranchId ? 'ไม่มีวันหยุดในสาขานี้' : 'ยังไม่มีวันหยุดที่บันทึกไว้'}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-stone-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">
                        วันที่
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">
                        พนักงาน
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">
                        สาขา
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">
                        หมายเหตุ
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-stone-700 uppercase tracking-wider">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {allHolidays.map((holiday) => (
                      <tr key={holiday.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3 text-sm text-stone-900">
                          {new Date(holiday.holidayDate).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short',
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-700">
                          {holiday.staffName}
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">
                          {holiday.branchName}
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">
                          {holiday.note || '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={async () => {
                              if (confirm('ต้องการลบวันหยุดนี้หรือไม่?')) {
                                try {
                                  const res = await fetch(`/api/admin/staff-holidays/${holiday.id}`, {
                                    method: 'DELETE',
                                  });
                                  if (res.ok) {
                                    await loadAllHolidays();
                                    if (selectedStaffId) {
                                      await loadHolidays();
                                    }
                                  } else {
                                    alert('ลบวันหยุดไม่สำเร็จ');
                                  }
                                } catch (err) {
                                  console.error('Error deleting holiday:', err);
                                  alert('เกิดข้อผิดพลาดในการลบ');
                                }
                              }
                            }}
                            className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-200"
                          >
                            <Icon icon="solar:trash-bin-minimalistic-bold" className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar View - Show 3 months (current + 2 months ahead) */}
      {activeTab === 'calendar' && selectedStaffId && (
        <div className="space-y-4">
          {[0, 1, 2].map((monthOffset) => {
            const now = new Date();
            const displayMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
            const year = displayMonth.getFullYear();
            const month = displayMonth.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstDay = new Date(year, month, 1).getDay();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const monthDays: (HolidayDate | null)[] = [];
            for (let i = 0; i < firstDay; i++) {
              monthDays.push(null);
            }
            for (let day = 1; day <= daysInMonth; day++) {
              const dateStr = toISODateString(new Date(year, month, day));
              const holiday = holidays.find(h => h.date === dateStr);
              monthDays.push(holiday || {
                date: dateStr,
                isHoliday: false,
              });
            }

            return (
              <div key={monthOffset} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
                <div className="mb-4 text-center">
                  <div className="text-base font-semibold text-stone-700">
                    {thaiMonths[month]} {year + 543}
                  </div>
                </div>

                {loading ? (
                  <div className="py-8 text-center text-sm text-stone-500">
                    กำลังโหลดข้อมูล...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-stone-500">
                      {thaiDays.map((day) => (
                        <div key={day} className="py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {monthDays.map((day, idx) => {
                        if (!day) {
                          return <div key={idx} className="h-14" />;
                        }

                        const date = new Date(day.date + 'T00:00:00');
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isPending = pendingDates.has(day.date);
                        const isOn = !day.isHoliday;
                        const isPast = date < today;

                        // Past dates are shown for reference only - label, no switch
                        if (isPast) {
                          return (
                            <div
                              key={day.date}
                              className={`relative h-14 rounded-md border border-dashed p-1 ${
                                day.isHoliday
                                  ? "border-red-200 bg-red-50/50"
                                  : "border-stone-200 bg-stone-50"
                              }`}
                              title={`${date.getDate()} ${thaiMonths[month]} - ${isOn ? "ทำงาน" : "วันหยุด"} (ผ่านมาแล้ว)`}
                            >
                              <div className="flex h-full flex-col items-center justify-center gap-1">
                                <span
                                  className={`text-[11px] font-medium leading-none ${
                                    day.isHoliday ? "text-red-400" : "text-stone-400"
                                  }`}
                                >
                                  {date.getDate()}
                                </span>
                                <span
                                  className={`rounded-full px-1.5 py-[1px] text-[8px] font-semibold leading-tight ${
                                    isOn
                                      ? "bg-stone-200 text-stone-500"
                                      : "bg-red-100 text-red-500"
                                  }`}
                                >
                                  {isOn ? "ON" : "OFF"}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={day.date}
                            className={`group relative h-14 rounded-md border border-stone-200 p-1 transition-colors ${
                              day.isHoliday
                                ? "border-red-300 bg-red-50"
                                : "bg-white hover:border-primary-300 hover:bg-stone-50"
                            }`}
                          >
                            <div className="flex h-full flex-col items-center justify-center gap-1">
                              <span
                                className={`text-[11px] font-medium leading-none ${
                                  day.isHoliday
                                    ? "text-red-700"
                                    : isToday
                                      ? "text-primary-700"
                                      : "text-stone-700"
                                }`}
                              >
                                {date.getDate()}
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isOn}
                                aria-label={`${date.getDate()} ${isOn ? "ทำงาน" : "วันหยุด"}`}
                                title={isOn ? "ทำงาน (ON)" : "วันหยุด (OFF)"}
                                onClick={() => toggleHoliday(day.date)}
                                disabled={isPending}
                                className={`relative inline-flex h-[15px] w-[28px] shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1 ${
                                  isOn ? "bg-green-500 hover:bg-green-600" : "bg-red-400 hover:bg-red-500"
                                } ${isPending ? "animate-pulse opacity-60" : ""}`}
                              >
                                <span
                                  className={`inline-block h-[11px] w-[11px] rounded-full bg-white shadow-sm transition-transform ${
                                    isOn ? "translate-x-[15px]" : "translate-x-[2px]"
                                  }`}
                                />
                              </button>
                              <span
                                className={`text-[8px] font-semibold leading-none ${
                                  isOn ? "text-green-700" : "text-red-700"
                                }`}
                              >
                                {isOn ? "ON" : "OFF"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'calendar' && !selectedStaffId && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-8 text-center text-sm text-stone-500">
          กรุณาเลือกสาขาและพนักงานเพื่อดูและบันทึกวันหยุด
        </div>
      )}
    </div>
  );
}

export default function AdminStaffHolidaysPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
          กำลังโหลด...
        </div>
      }
    >
      <AdminStaffHolidaysContent />
    </Suspense>
  );
}
