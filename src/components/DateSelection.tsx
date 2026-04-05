// Booking Step 3: Date Selection (ขั้นตอนที่ 3: เลือกวันที่)
import React, { useState, useEffect } from 'react';
import { SHOP_CONFIG } from '../constants';
import { toISODateString, formatThaiDateShort } from '../utils';
import { XCircle } from 'lucide-react';

interface DateSelectionProps {
  selectedDate: Date | null;
  onSelect: (d: Date) => void;
  onBack?: () => void;
  branchId?: string;
}

export const DateSelection: React.FC<DateSelectionProps> = ({
  selectedDate,
  onSelect,
  onBack,
  branchId,
}) => {
  const [dates, setDates] = useState<Date[]>([]);
  const [fullDates, setFullDates] = useState<Set<string>>(new Set());
  const [availableSlotCount, setAvailableSlotCount] = useState<Record<string, number>>({});

  useEffect(() => {
    const arr: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    setDates(arr);
  }, []);

  useEffect(() => {
    if (!branchId || dates.length === 0) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        dates.map(async (date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;
          try {
            const res = await fetch(
              `/api/slots-availability?branchId=${encodeURIComponent(branchId)}&date=${encodeURIComponent(dateStr)}&_t=${Date.now()}`,
              { cache: 'no-store', headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } }
            );
            const data = await res.json();
            if (!res.ok) return { dateStr, full: false };
            const slots: Array<{ availableCount?: number }> = Array.isArray(data.slots) ? data.slots : [];
            const full = slots.length > 0 && slots.every((s) => (s.availableCount ?? 0) === 0);
            const available = slots.filter((s) => (s.availableCount ?? 0) > 0).length;
            return { dateStr, full, available };
          } catch {
            return { dateStr, full: false, available: 0 };
          }
        })
      );
      if (cancelled) return;
      const fullSet = new Set(results.filter((r) => r.full).map((r) => r.dateStr));
      const countMap: Record<string, number> = {};
      results.forEach((r) => { countMap[r.dateStr] = r.available ?? 0; });
      setFullDates(fullSet);
      setAvailableSlotCount(countMap);
    })();
    return () => { cancelled = true; };
  }, [branchId, dates]);

  const getDayName = (date: Date) => {
    return new Intl.DateTimeFormat('th-TH', { weekday: 'long' }).format(date);
  };

  const isHoliday = (date: Date) => {
    const dateString = toISODateString(date);
    return SHOP_CONFIG.holidays.includes(dateString);
  };

  const toDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="grid grid-cols-2 gap-4">
        {dates.map((date, idx) => {
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          const holiday = isHoliday(date);
          const dateStr = toDateStr(date);
          const isFull = !holiday && fullDates.has(dateStr);
          const availCount = availableSlotCount[dateStr];
          const hasAvailData = availCount !== undefined;
          const isDisabled = holiday;

          return (
            <button
              key={idx}
              onClick={() => !isDisabled && onSelect(date)}
              disabled={isDisabled}
              className={`
                flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
                touch-manipulation shadow-sm relative overflow-hidden
                ${isDisabled
                  ? 'bg-stone-100 border-stone-200 opacity-60 cursor-not-allowed'
                  : isSelected
                    ? 'border-primary-500 bg-primary-600 text-white ring-2 ring-primary-300 ring-offset-2 active:scale-95'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-primary-300 hover:bg-stone-50 active:scale-95'}
              `}
            >
              <span className={`text-sm font-medium mb-0.5 ${isSelected ? 'text-primary-100' : 'text-stone-500'}`}>
                {getDayName(date)}
              </span>
              <span className={`text-lg font-bold ${holiday ? 'line-through text-stone-400' : ''}`}>
                {formatThaiDateShort(date)}
              </span>
              {holiday && (
                <div className="absolute top-1 right-1 text-red-400">
                  <XCircle size={14} />
                </div>
              )}
              {isFull && (
                <span className="absolute top-1 right-1 bg-red-100 text-red-500 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
                  จองเต็มแล้ว
                </span>
              )}
              {!holiday && !isFull && hasAvailData && (
                <span className="absolute top-1 right-1 bg-emerald-100 text-emerald-600 border border-emerald-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
                  ว่าง {availCount} เวลา
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
