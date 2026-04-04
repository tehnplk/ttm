// Booking Step 4: Time Selection (ขั้นตอนที่ 4: เลือกเวลา)
import React, { useState, useEffect } from 'react';
import { TimeSlot } from '../types';
import { Loader2 } from 'lucide-react';

interface TimeSelectionProps {
  selectedDate: Date;
  selectedTime: TimeSlot | null;
  branchId?: string; // Add branchId prop
  onSelect: (t: TimeSlot) => void;
  onBack?: () => void;
}

// Generate time slots from opening hours (startTime - endTime)
// Display full time ranges like "08:30 - 09:30"
function generateTimeSlotsFromHours(openingHours: Array<{ startTime: string; endTime: string }>): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  openingHours.forEach((hour, index) => {
    // Display as full time range: "08:30 - 09:30"
    const timeRange = `${hour.startTime} - ${hour.endTime}`;
    
    slots.push({
      id: `t-${index}-${hour.startTime}-${hour.endTime}`,
      time: timeRange, // Display full range like "08:30 - 09:30"
      available: true
    });
  });
  
  return slots;
}

export const TimeSelection: React.FC<TimeSelectionProps> = ({ 
  selectedDate,
  selectedTime,
  branchId,
  onSelect,
  onBack
}) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingHours, setOpeningHours] = useState<Array<{ startTime: string; endTime: string }>>([]);
  const [availableCountByTime, setAvailableCountByTime] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadOpeningHours() {
      if (!branchId) {
        setError('กรุณาเลือกสาขาก่อน');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(
          `/api/opening-hours?branchId=${encodeURIComponent(branchId)}&_t=${Date.now()}`,
          { cache: 'no-store', headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } }
        );
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load opening hours');
        }
        
        const hours = data.timeSlots || [];
        setOpeningHours(hours);
        
        if (hours.length === 0) {
          setError('สาขานี้ยังไม่ได้ตั้งค่าเวลาเปิด-ปิด');
          setSlots([]);
          setAvailableCountByTime({});
        } else {
          const generatedSlots = generateTimeSlotsFromHours(hours);
          setSlots(generatedSlots);
          setError(null);
        }
      } catch (err: any) {
        setError(err.message || 'ไม่สามารถโหลดเวลาที่เปิดได้');
        console.error('Error loading opening hours:', err);
        setSlots([]);
        setAvailableCountByTime({});
      } finally {
        setLoading(false);
      }
    }
    void loadOpeningHours();
  }, [branchId]);

  // Load available staff count per time slot when we have branchId and selectedDate
  useEffect(() => {
    const bid = branchId != null ? String(branchId) : '';
    if (!bid || !selectedDate) {
      setAvailableCountByTime({});
      return;
    }
    // ใช้ local date ไม่ใช้ toISOString (timezone UTC ทำให้วันที่ผิดใน production)
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/slots-availability?branchId=${encodeURIComponent(bid)}&date=${encodeURIComponent(dateStr)}&_t=${Date.now()}`,
          { cache: 'no-store', headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } }
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[TimeSelection] slots-availability error:', data.error || data.details);
          }
          setAvailableCountByTime({});
          return;
        }
        const slotsList = Array.isArray(data.slots) ? data.slots : [];
        const map: Record<string, number> = {};
        const normalizeTime = (t: string) => t.replace(/(\d{2}:\d{2}):\d{2}/g, '$1'); // "08:30:00 - 10:00:00" -> "08:30 - 10:00"
        slotsList.forEach((s: { time?: string; availableCount?: number }) => {
          const time = s?.time;
          const count = typeof s?.availableCount === 'number' ? s.availableCount : 0;
          if (time) {
            map[time] = count;
            map[normalizeTime(time)] = count; // fallback ถ้ารูปแบบต่างกัน
          }
        });
        setAvailableCountByTime(map);
      } catch (err) {
        if (!cancelled) {
          setAvailableCountByTime({});
          if (process.env.NODE_ENV === 'development') {
            console.error('[TimeSelection] slots-availability fetch failed:', err);
          }
        }
      }
    })();
    return () => { cancelled = true; };
  }, [branchId, selectedDate]);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary-600" size={32} />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-rose-600">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
        {slots.map((slot) => {
          const isSelected = selectedTime?.id === slot.id;
          const normalizeKey = (t: string) => t.replace(/(\d{2}:\d{2}):\d{2}/g, '$1');
          const availableCount = availableCountByTime[slot.time] ?? availableCountByTime[normalizeKey(slot.time)];
          const showCount = typeof availableCount === 'number';
          const noStaffAvailable = showCount && availableCount === 0;
          const isDisabled = !slot.available || noStaffAvailable;
          return (
            <button
              key={slot.id}
              disabled={isDisabled}
              onClick={() => onSelect(slot)}
              className={`
                py-3 rounded-xl border-2 font-semibold text-sm transition-all relative overflow-hidden touch-manipulation
                ${isDisabled 
                  ? 'bg-stone-100 text-stone-300 border-stone-100 cursor-not-allowed' 
                  : isSelected 
                    ? 'bg-primary-600 text-white border-primary-600 shadow-lg scale-105 ring-2 ring-primary-300 ring-offset-1' 
                    : 'bg-white text-stone-700 border-stone-200 hover:border-primary-400 hover:bg-stone-50'}
              `}
            >
              <span className="block">{slot.time}</span>
              {showCount && (
                <span className={`
                  inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium mt-1
                  ${isSelected 
                    ? 'bg-primary-500/80 text-white' 
                    : 'bg-primary-100 text-primary-700'}
                `}>
                  ว่าง {availableCount} คน
                </span>
              )}
            </button>
          );
        })}
        </div>
      )}
    </div>
  );
};
