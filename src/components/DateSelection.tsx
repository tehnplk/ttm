// Booking Step 3: Date Selection (ขั้นตอนที่ 3: เลือกวันที่)
import React, { useState, useEffect } from 'react';
import { SHOP_CONFIG } from '../constants';
import { toISODateString, formatThaiDateShort } from '../utils';
import { XCircle } from 'lucide-react';

interface DateSelectionProps {
  selectedDate: Date | null;
  onSelect: (d: Date) => void;
  onBack?: () => void;
}

export const DateSelection: React.FC<DateSelectionProps> = ({ 
  selectedDate, 
  onSelect,
  onBack
}) => {
  const [dates, setDates] = useState<Date[]>([]);

  useEffect(() => {
    const arr = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    setDates(arr);
  }, []);

  const getDayName = (date: Date) => {
    return new Intl.DateTimeFormat('th-TH', { weekday: 'long' }).format(date);
  };

  const isHoliday = (date: Date) => {
    const dateString = toISODateString(date);
    return SHOP_CONFIG.holidays.includes(dateString);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="grid grid-cols-2 gap-4">
        {dates.map((date, idx) => {
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          const holiday = isHoliday(date);
          
          return (
            <button
              key={idx}
              onClick={() => !holiday && onSelect(date)}
              disabled={holiday}
              className={`
                flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
                touch-manipulation shadow-sm relative overflow-hidden
                ${holiday 
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
            </button>
          );
        })}
      </div>
    </div>
  );
};
