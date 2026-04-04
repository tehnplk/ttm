'use client';

import { useEffect, useState, useRef } from "react";
import { Icon } from "@iconify/react";
import { formatThaiDateString } from "@/utils";

type ScheduleRow = {
  id: string;
  staffId: string;
  staffName: string;
  offDays: string;
  busySlots: string;
};

type ScheduleFormState = {
  id?: string;
  staffId: string;
  offDays: string;
  busySlots: string;
};

type StaffOption = {
  id: string;
  name: string;
};

// Time slots available
const TIME_SLOTS = [
  { label: "08:30 - 10:30", value: "08:30-10:30" },
  { label: "10:30 - 12:30", value: "10:30-12:30" },
  { label: "13:00 - 15:00", value: "13:00-15:00" },
  { label: "15:00 - 17:00", value: "15:00-17:00" },
  { label: "17:00 - 19:00", value: "17:00-19:00" },
  { label: "19:00 - 20:30", value: "19:00-20:30" },
];

// Thai Date Picker Component
function ThaiDatePicker({ 
  selectedDate, 
  onDateChange, 
  onClose 
}: { 
  selectedDate: Date; 
  onDateChange: (date: Date) => void;
  onClose: () => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const days = [];

  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  const handleDateClick = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    onDateChange(date);
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const isSelected = (day: number) => {
    if (!day) return false;
    const date = new Date(currentYear, currentMonth, day);
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (day: number) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded p-1 text-stone-600 hover:bg-stone-100"
        >
          <Icon icon="solar:alt-arrow-left-linear" className="h-3.5 w-3.5" />
        </button>
        <div className="text-xs font-semibold text-stone-700">
          {thaiMonths[currentMonth]} {currentYear + 543}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded p-1 text-stone-600 hover:bg-stone-100"
        >
          <Icon icon="solar:alt-arrow-right-linear" className="h-3.5 w-3.5" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {thaiDays.map((day) => (
          <div key={day} className="py-1 text-[10px] font-medium text-stone-500">
            {day}
          </div>
        ))}
        {days.map((day, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => day && handleDateClick(day)}
            disabled={!day}
            className={`py-1 text-[11px] transition-colors ${
              !day
                ? ''
                : isSelected(day)
                  ? 'rounded bg-primary-600 font-semibold text-white'
                  : isToday(day)
                    ? 'rounded bg-primary-100 font-medium text-primary-700'
                    : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            {day || ''}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AdminSchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<ScheduleRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [form, setForm] = useState<ScheduleFormState>({
    staffId: "",
    offDays: "[]",
    busySlots: "{}",
  });

  // UI state for offDays (array of date strings)
  const [selectedOffDays, setSelectedOffDays] = useState<string[]>([]);

  // UI state for busySlots (object: { date: string[] })
  const [selectedBusyDate, setSelectedBusyDate] = useState<string>("");
  const [selectedBusySlots, setSelectedBusySlots] = useState<{ [date: string]: string[] }>({});
  
  // Thai date picker state
  const [showOffDayPicker, setShowOffDayPicker] = useState(false);
  const [showBusyDatePicker, setShowBusyDatePicker] = useState(false);
  const [offDayPickerDate, setOffDayPickerDate] = useState<Date>(new Date());
  const [busyDatePickerDate, setBusyDatePickerDate] = useState<Date>(new Date());

  async function loadSchedules() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/schedule");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "โหลดข้อมูลตารางพนักงานไม่สำเร็จ");
      }
      setSchedules(data.schedules ?? []);
      setFilteredSchedules(data.schedules ?? []);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "โหลดข้อมูลตารางพนักงานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function loadStaff() {
    try {
      const res = await fetch("/api/admin/staff");
      if (!res.ok) {
        console.error("Failed to fetch staff: HTTP", res.status);
        setStaff([]);
        return;
      }
      
      const data = await res.json();
      
      if (data.staff && Array.isArray(data.staff)) {
        // Map employee data to staff options
        const staffList = data.staff.map((e: any) => {
          const prename = e.prename || '';
          const fname = e.fname || '';
          const lname = e.lname || '';
          const fullName = `${prename}${fname} ${lname}`.trim();
          return {
            id: String(e.id),
            name: fullName || `พนักงาน #${e.id}`
          };
        });
        setStaff(staffList);
      } else {
        console.error("Invalid staff data format:", data);
        setStaff([]);
      }
    } catch (err) {
      console.error("Failed to load staff:", err);
      setStaff([]);
    }
  }

  useEffect(() => {
    void loadSchedules();
    void loadStaff();
  }, []);

  // Filter schedules based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSchedules(schedules);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = schedules.filter(
      (s) =>
        s.staffName.toLowerCase().includes(query),
    );
    setFilteredSchedules(filtered);
  }, [searchQuery, schedules]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staffId) {
      setError("กรุณาเลือกพนักงาน");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Convert UI state to JSON strings
      const offDaysJson = JSON.stringify(selectedOffDays);
      const busySlotsJson = JSON.stringify(selectedBusySlots);

      const submitData = {
        ...form,
        offDays: offDaysJson,
        busySlots: busySlotsJson,
      };

      if (form.id) {
        // Update
        const res = await fetch(`/api/admin/schedule/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "แก้ไขข้อมูลตารางพนักงานไม่สำเร็จ");
        }
      } else {
        // Create
        const res = await fetch("/api/admin/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "บันทึกข้อมูลตารางพนักงานไม่สำเร็จ");
        }
      }

      setShowModal(false);
      setForm({
        staffId: "",
        offDays: "[]",
        busySlots: "{}",
      });
      setSelectedOffDays([]);
      setSelectedBusySlots({});
      setSelectedBusyDate("");
      await loadSchedules();
    } catch (err: any) {
      setError(err.message ?? "บันทึกข้อมูลตารางพนักงานไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบตารางพนักงานนี้?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/schedule/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ลบข้อมูลตารางพนักงานไม่สำเร็จ");
      }
      await loadSchedules();
    } catch (err: any) {
      alert(err.message ?? "ลบข้อมูลตารางพนักงานไม่สำเร็จ");
    }
  }

  function handleEdit(schedule: ScheduleRow) {
    // Parse JSON strings to arrays/objects
    let offDaysArray: string[] = [];
    let busySlotsObj: { [date: string]: string[] } = {};
    
    try {
      offDaysArray = JSON.parse(schedule.offDays || "[]");
    } catch (e) {
      console.error("Failed to parse offDays", e);
    }
    
    try {
      busySlotsObj = JSON.parse(schedule.busySlots || "{}");
    } catch (e) {
      console.error("Failed to parse busySlots", e);
    }

    const selectedStaff = staff.find(s => s.id === schedule.staffId);
    setForm({
      id: schedule.id,
      staffId: schedule.staffId,
      offDays: schedule.offDays,
      busySlots: schedule.busySlots,
    });
    setSelectedOffDays(offDaysArray);
    setSelectedBusySlots(busySlotsObj);
    setSelectedBusyDate("");
    setStaffSearchQuery(selectedStaff?.name || "");
    setShowStaffDropdown(false);
    setError(null);
    setShowModal(true);
  }

  function handleAdd() {
    setForm({
      staffId: "",
      offDays: "[]",
      busySlots: "{}",
    });
    setSelectedOffDays([]);
    setSelectedBusySlots({});
    setSelectedBusyDate("");
    setError(null);
    setShowModal(true);
  }

  // Handle offDays date selection
  function handleOffDayAdd(date: string) {
    if (!date) return;
    const dateStr = date.split('T')[0]; // Get YYYY-MM-DD format
    if (!selectedOffDays.includes(dateStr)) {
      setSelectedOffDays([...selectedOffDays, dateStr].sort());
    }
  }

  function handleOffDayRemove(date: string) {
    setSelectedOffDays(selectedOffDays.filter(d => d !== date));
  }

  // Handle busySlots selection
  function handleBusySlotToggle(date: string, slot: string) {
    if (!date) return;
    const dateStr = date.split('T')[0]; // Get YYYY-MM-DD format
    const currentSlots = selectedBusySlots[dateStr] || [];
    
    if (currentSlots.includes(slot)) {
      // Remove slot
      const newSlots = currentSlots.filter(s => s !== slot);
      if (newSlots.length === 0) {
        const { [dateStr]: _, ...rest } = selectedBusySlots;
        setSelectedBusySlots(rest);
      } else {
        setSelectedBusySlots({ ...selectedBusySlots, [dateStr]: newSlots });
      }
    } else {
      // Add slot
      setSelectedBusySlots({ ...selectedBusySlots, [dateStr]: [...currentSlots, slot].sort() });
    }
  }

  function handleBusyDateRemove(date: string) {
    const { [date]: _, ...rest } = selectedBusySlots;
    setSelectedBusySlots(rest);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-bold tracking-tight">
            ตารางหยุดพนักงาน
          </h1>
          <p className="text-sm text-stone-500">
            ใช้จัดการวันหยุด (offDays) และช่วงเวลาที่ไม่ว่าง (busySlots) ของพนักงาน
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
        >
          <span>+</span>
          <span>เพิ่ม</span>
        </button>
      </div>

      {/* Search bar */}
      <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Icon
            icon="solar:magnifer-linear"
            className="h-4 w-4 text-stone-400"
          />
          <input
            type="text"
            placeholder="ค้นหาตารางพนักงาน (ชื่อพนักงาน)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="rounded-full p-1 text-stone-400 hover:bg-stone-100"
            >
              <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ตารางตารางพนักงาน */}
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-stone-500">
            กำลังโหลดข้อมูล...
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-500">
            {searchQuery
              ? "ไม่พบข้อมูลที่ค้นหา"
              : "ยังไม่มีข้อมูลตารางพนักงาน ลองกดปุ่ม \"เพิ่ม\" ด้านบนขวา"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-medium uppercase text-stone-600">
                  <th className="px-4 py-3 text-left">พนักงาน</th>
                  <th className="px-4 py-3 text-left">วันหยุด (offDays)</th>
                  <th className="px-4 py-3 text-left">ช่วงเวลาที่ไม่ว่าง (busySlots)</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-stone-100 transition-colors hover:bg-stone-50/50"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-stone-900">
                        {s.staffName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      {(() => {
                        try {
                          const offDays = JSON.parse(s.offDays || "[]");
                          if (offDays.length === 0) return <span className="text-stone-400">ไม่มี</span>;
                          return (
                            <div className="flex flex-wrap gap-1">
                              {offDays.slice(0, 3).map((date: string) => (
                                <span key={date} className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600">
                                  {new Date(date + 'T00:00:00').toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                                </span>
                              ))}
                              {offDays.length > 3 && (
                                <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600">
                                  +{offDays.length - 3}
                                </span>
                              )}
                            </div>
                          );
                        } catch {
                          return <span className="text-stone-400">-</span>;
                        }
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      {(() => {
                        try {
                          const busySlots = JSON.parse(s.busySlots || "{}");
                          const dates = Object.keys(busySlots);
                          if (dates.length === 0) return <span className="text-stone-400">ไม่มี</span>;
                          return (
                            <div className="space-y-1">
                              {dates.slice(0, 2).map((date) => (
                                <div key={date} className="text-[10px]">
                                  <span className="font-medium text-stone-600">
                                    {new Date(date + 'T00:00:00').toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}:
                                  </span>
                                  <span className="ml-1 text-stone-500">
                                    {busySlots[date].length} ช่วงเวลา
                                  </span>
                                </div>
                              ))}
                              {dates.length > 2 && (
                                <span className="text-[10px] text-stone-400">
                                  +{dates.length - 2} วันที่
                                </span>
                              )}
                            </div>
                          );
                        } catch {
                          return <span className="text-stone-400">-</span>;
                        }
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(s)}
                          className="rounded-md px-2 py-1 text-xs text-primary-600 hover:bg-primary-50"
                          title="แก้ไข"
                        >
                          <Icon icon="solar:pen-linear" className="h-4 w-4 text-black" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          className="rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                          title="ลบ"
                        >
                          <Icon
                            icon="solar:trash-bin-trash-linear"
                            className="h-4 w-4"
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal เพิ่ม/แก้ไขตารางพนักงาน */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl rounded-xl border border-stone-200 bg-white p-5 lg:p-6 xl:p-8 shadow-xl my-auto">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-stone-900">
                  {form.id ? "แก้ไขข้อมูลตารางหยุดพนักงาน" : "เพิ่มตารางหยุดพนักงาน"}
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  ตั้งค่าวันหยุดและช่วงเวลาที่ไม่ว่างของพนักงาน
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                }}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100"
              >
                <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-700">
                  พนักงาน <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    placeholder="ค้นหาหรือเลือกพนักงาน..."
                    value={staffSearchQuery || staff.find(s => s.id === form.staffId)?.name || ""}
                    onChange={(e) => {
                      setStaffSearchQuery(e.target.value);
                      setShowStaffDropdown(true);
                      if (!e.target.value) {
                        setForm((prev) => ({ ...prev, staffId: "" }));
                      }
                    }}
                    onFocus={() => setShowStaffDropdown(true)}
                    onBlur={() => {
                      // Delay to allow click on dropdown item
                      setTimeout(() => setShowStaffDropdown(false), 200);
                    }}
                  />
                  {showStaffDropdown && (
                    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-stone-200 bg-white shadow-lg">
                      {staff.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-stone-500">
                          กำลังโหลดข้อมูลพนักงาน...
                        </div>
                      ) : (() => {
                        const filtered = staff.filter((s) =>
                          s.name.toLowerCase().includes(staffSearchQuery.toLowerCase())
                        );
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
                                form.staffId === s.id
                                  ? "bg-primary-50 text-primary-700"
                                  : "text-stone-700 hover:bg-stone-50"
                              }`}
                              onClick={() => {
                                setForm((prev) => ({ ...prev, staffId: s.id }));
                                setStaffSearchQuery(s.name);
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
                  {form.staffId && (
                    <input type="hidden" name="staffId" value={form.staffId} />
                  )}
                </div>
              </div>

              {/* วันหยุด (offDays) */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-stone-700">
                  วันหยุด <span className="text-stone-400 font-normal">(เลือกวันที่พนักงานหยุด)</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      readOnly
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 cursor-pointer"
                      placeholder="คลิกเพื่อเลือกวันที่"
                      value={offDayPickerDate ? new Date(offDayPickerDate).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short'
                      }) : ""}
                      onClick={() => setShowOffDayPicker(!showOffDayPicker)}
                    />
                    {showOffDayPicker && (
                      <div className="absolute z-50 mt-1 rounded-lg border border-stone-200 bg-white p-2 shadow-lg">
                        <ThaiDatePicker
                          selectedDate={offDayPickerDate}
                          onDateChange={(date) => {
                            setOffDayPickerDate(date);
                            setShowOffDayPicker(false);
                          }}
                          onClose={() => setShowOffDayPicker(false)}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (offDayPickerDate) {
                        const dateStr = offDayPickerDate.toISOString().split('T')[0];
                        handleOffDayAdd(dateStr);
                      }
                    }}
                    className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-medium text-white hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
                  >
                    เพิ่ม
                  </button>
                </div>
                {selectedOffDays.length > 0 && (
                  <div className="flex flex-wrap gap-2 rounded-lg border border-stone-200 bg-stone-50 p-2">
                    {selectedOffDays.map((date) => (
                      <span
                        key={date}
                        className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs text-red-700 shadow-sm border border-red-300"
                      >
                        {new Date(date + 'T00:00:00').toLocaleDateString('th-TH', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          weekday: 'short'
                        })}
                        <button
                          type="button"
                          onClick={() => handleOffDayRemove(date)}
                          className="text-stone-400 hover:text-rose-600"
                        >
                          <Icon icon="solar:close-circle-bold" className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ช่วงเวลาที่ไม่ว่าง (busySlots) */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-stone-700">
                  ช่วงเวลาที่ไม่ว่าง <span className="text-stone-400 font-normal">(เลือกวันที่และช่วงเวลาที่พนักงานไม่ว่าง)</span>
                </label>
                
                {/* เลือกวันที่ */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      readOnly
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 cursor-pointer"
                      placeholder="คลิกเพื่อเลือกวันที่"
                      value={busyDatePickerDate ? new Date(busyDatePickerDate).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short'
                      }) : ""}
                      onClick={() => setShowBusyDatePicker(!showBusyDatePicker)}
                    />
                    {showBusyDatePicker && (
                      <div className="absolute z-50 mt-1 rounded-lg border border-stone-200 bg-white p-2 shadow-lg">
                        <ThaiDatePicker
                          selectedDate={busyDatePickerDate}
                          onDateChange={(date) => {
                            setBusyDatePickerDate(date);
                            const dateStr = date.toISOString().split('T')[0];
                            setSelectedBusyDate(dateStr);
                            setShowBusyDatePicker(false);
                          }}
                          onClose={() => setShowBusyDatePicker(false)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* เลือกช่วงเวลา */}
                {selectedBusyDate && (
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <div className="mb-2 text-xs font-medium text-stone-700">
                      เลือกช่วงเวลาสำหรับวันที่ {new Date(selectedBusyDate + 'T00:00:00').toLocaleDateString('th-TH', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        weekday: 'short'
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {TIME_SLOTS.map((slot) => {
                        const dateStr = selectedBusyDate.split('T')[0];
                        const isSelected = selectedBusySlots[dateStr]?.includes(slot.value) || false;
                        return (
                          <label
                            key={slot.value}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                              isSelected
                                ? "border-primary-500 bg-primary-50 text-primary-700"
                                : "border-stone-300 bg-white text-stone-700 hover:border-primary-300 hover:bg-stone-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleBusySlotToggle(selectedBusyDate, slot.value)}
                              className="h-3.5 w-3.5 rounded border-stone-300 text-purple-600 focus:ring-purple-200 checked:bg-purple-600 checked:border-purple-600"
                            />
                            <span className="font-medium">{slot.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* แสดงวันที่และช่วงเวลาที่เลือกแล้ว */}
                {Object.keys(selectedBusySlots).length > 0 && (
                  <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <div className="text-xs font-medium text-stone-700">วันที่และช่วงเวลาที่เลือกแล้ว:</div>
                    {Object.entries(selectedBusySlots).map(([date, slots]) => (
                      <div
                        key={date}
                        className="rounded-md bg-white p-2 border border-stone-200"
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-xs font-medium text-stone-700">
                            {new Date(date + 'T00:00:00').toLocaleDateString('th-TH', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              weekday: 'short'
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleBusyDateRemove(date)}
                            className="text-stone-400 hover:text-rose-600"
                          >
                            <Icon icon="solar:trash-bin-trash-linear" className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {slots.map((slot) => (
                            <span
                              key={slot}
                              className="rounded bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700"
                            >
                              {TIME_SLOTS.find(s => s.value === slot)?.label || slot}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-600">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                  }}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:ring-offset-2"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon
                    icon={submitting ? "solar:hourglass-line-bold" : "solar:check-circle-bold"}
                    className="h-4 w-4"
                  />
                  {submitting
                    ? "กำลังบันทึก..."
                    : form.id
                      ? "บันทึกการแก้ไข"
                      : "บันทึกตารางพนักงาน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
