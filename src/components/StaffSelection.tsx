// Booking Step 5: Staff Selection (ขั้นตอนที่ 5: เลือกพนักงาน)
import React, { useState, useEffect } from 'react';
import { Staff, TimeSlot, StaffSchedule } from '../types';
import { toISODateString } from '../utils';
import { Search, CheckCircle2, Loader2 } from 'lucide-react';

interface StaffSelectionProps {
  serviceId: string;
  selectedStaff: Staff | null;
  date: Date;
  timeSlot: TimeSlot;
  branchId?: string; // Add branchId prop
  onSelect: (s: Staff) => void;
  onBack?: () => void;
}

export const StaffSelection: React.FC<StaffSelectionProps> = ({ 
  serviceId,
  selectedStaff, 
  date,
  timeSlot,
  branchId,
  onSelect,
  onBack
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<{ [key: string]: StaffSchedule }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStaff() {
      if (!branchId) {
        setError('กรุณาเลือกสาขาก่อน');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const dateStr = toISODateString(date);
        const timeStr = timeSlot.time;
        const url = `/api/staff?branchId=${encodeURIComponent(branchId)}&date=${dateStr}&time=${encodeURIComponent(timeStr)}`;
        
        console.log('[StaffSelection] Fetching staff:', { branchId, date: dateStr, time: timeStr, url });
        
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();
        
        if (!res.ok) {
          console.error('[StaffSelection] API error response:', data);
          throw new Error(data.error || data.details || 'Failed to load staff');
        }
        
        console.log('[StaffSelection] Staff data from API:', data.staff?.map((s: any) => ({
          id: s.id,
          name: s.name,
          isOff: s.isOff,
          hasBooking: s.hasBooking
        })));
        
        setStaff(data.staff || []);
        setError(null);
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to load staff';
        setError(errorMessage);
        console.error('Error loading staff:', err);
      } finally {
        setLoading(false);
      }
    }
    void loadStaff();
  }, [branchId, date]);

  // Load schedules for all staff
  useEffect(() => {
    async function loadSchedules() {
      const scheduleMap: { [key: string]: StaffSchedule } = {};
      for (const s of staff) {
        try {
          const res = await fetch(`/api/schedule?staffId=${s.id}`);
          const data = await res.json();
          if (res.ok) {
            scheduleMap[s.id] = {
              staffId: data.staffId,
              offDays: data.offDays || [],
              busySlots: data.busySlots || {},
            };
          }
        } catch (err) {
          console.error(`Error loading schedule for staff ${s.id}:`, err);
        }
      }
      setSchedules(scheduleMap);
    }
    if (staff.length > 0) {
      void loadSchedules();
    }
  }, [staff]);

  // Filter staff by search term only
  // Don't filter by specialty since staff from API may not have specialty data
  const availableStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const checkAvailability = (staffId: string) => {
    // Check if staff has existing booking
    const staffMember = staff.find(s => s.id === staffId);
    if (staffMember && (staffMember as any).isOff) {
      return { available: false, reason: 'หยุด' };
    }
    if (staffMember && (staffMember as any).hasBooking) {
      return { available: false, reason: 'มีจองแล้ว' };
    }

    const schedule = schedules[staffId];
    if (!schedule) return { available: true, reason: '' }; // No specific schedule means available

    const dateStr = toISODateString(date);

    // Check Day Off
    if (schedule.offDays.includes(dateStr)) {
      return { available: false, reason: 'วันหยุด' };
    }

    // Check Busy Time
    const busyTimes = schedule.busySlots[dateStr];
    if (busyTimes && busyTimes.includes(timeSlot.time)) {
      return { available: false, reason: 'ไม่ว่าง' };
    }

    return { available: true, reason: '' };
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
        <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อพนักงาน..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-stone-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-lg transition-colors"
            suppressHydrationWarning
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary-600" size={32} />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-rose-600">
            {error}
          </div>
        ) : availableStaff.length === 0 ? (
          <div className="text-center py-8 text-stone-400">
            ไม่พบรายชื่อพนักงาน
          </div>
        ) : (
          availableStaff.map((staffMember) => {
            const isSelected = selectedStaff?.id === staffMember.id;
            const { available, reason } = checkAvailability(staffMember.id);

            return (
              <button
                key={staffMember.id}
                onClick={() => available && onSelect(staffMember)}
                disabled={!available}
                className={`
                  w-full flex items-center p-3 rounded-2xl border-2 transition-all touch-manipulation text-left
                  ${!available 
                    ? 'bg-stone-50 border-stone-100 opacity-60 cursor-not-allowed' 
                    : isSelected 
                      ? 'border-primary-500 bg-primary-50 shadow-md ring-1 ring-primary-500 active:scale-[0.98]' 
                      : 'border-stone-200 bg-white hover:border-primary-300 active:scale-[0.98]'}
                `}
              >
                <div className="relative flex-shrink-0">
                  <img 
                    src={staffMember.image} 
                    alt={staffMember.name} 
                    className={`w-16 h-16 rounded-full object-cover border-2 shadow-sm ${!available ? 'grayscale border-stone-200' : 'border-white'}`} 
                  />
                  {!available && (
                     <div className="absolute inset-0 bg-stone-100/50 rounded-full flex items-center justify-center">
                       <span className="text-[10px] font-bold bg-stone-600 text-white px-1.5 py-0.5 rounded-full">{reason}</span>
                     </div>
                  )}
                </div>
                
                <div className="ml-3 flex-1 min-w-0">
                  <h3 className={`text-base font-bold mb-0.5 ${isSelected ? 'text-primary-900' : 'text-stone-800'}`}>{staffMember.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    {(staffMember as any).nickname && <span>({(staffMember as any).nickname})</span>}
                    {(staffMember as any).nickname && (staffMember as any).sex && (
                      <span className="text-stone-400">•</span>
                    )}
                    {(staffMember as any).sex && (
                      <span>{(staffMember as any).sex === 'ชาย' ? 'ชาย' : (staffMember as any).sex === 'หญิง' ? 'หญิง' : (staffMember as any).sex}</span>
                    )}
                    {(staffMember as any).age && (
                      <>
                        <span className="text-stone-400">•</span>
                        <span>อายุ {(staffMember as any).age} ปี</span>
                      </>
                    )}
                    {!available && reason && (
                      <>
                        <span className="text-stone-400">•</span>
                        <span className="text-rose-600 font-semibold">{reason}</span>
                      </>
                    )}
                  </div>
                </div>
                
                {isSelected && (
                  <div className="mr-2 text-primary-600 flex-shrink-0">
                    <CheckCircle2 size={24} className="fill-current text-white bg-primary-600 rounded-full" />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
