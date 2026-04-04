// Booking Step 6: Confirmation (ขั้นตอนที่ 6: ยืนยันข้อมูล)
import React, { useEffect, useState } from 'react';
import { BookingState } from '../types';
import { formatThaiDate, formatPhoneNumber } from '../utils';
import { Button } from './Button';
import { CheckCircle2, Phone, AlertCircle, Loader2 } from 'lucide-react';

interface ConfirmationProps {
  bookingState: BookingState;
  onConfirm: () => void;
  onChange: (field: keyof BookingState, value: any) => void;
  onBack?: () => void;
  isLoading?: boolean;
}

export const Confirmation: React.FC<ConfirmationProps> = ({ 
  bookingState, 
  onConfirm,
  onChange,
  onBack,
  isLoading = false
}) => {
  const [isValidPhone, setIsValidPhone] = useState(true);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Limit to 10 digits
    const truncated = rawValue.slice(0, 10);
    
    onChange('customerPhone', truncated);

    // Validate: Must be 10 digits and start with 06, 08, 09
    const regex = /^0[689]\d{8}$/;
    setIsValidPhone(regex.test(truncated) || truncated.length === 0);
  };

  // แยกชื่อ-นามสกุลจากค่าเดิม (หากมี) และซิงก์เมื่อ bookingState เปลี่ยน
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    const parts = (bookingState.customerName || "").trim().split(" ");
    const newFirst = parts[0] || "";
    const newLast = parts.slice(1).join(" ").trim();
    // ซิงก์ค่าเมื่อ bookingState เปลี่ยน (เช่น preload จาก LINE / auto-fill)
    if (newFirst !== firstName || newLast !== lastName) {
      setFirstName(newFirst);
      setLastName(newLast);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingState.customerName]);

  // ตรวจสอบความถูกต้องของเบอร์เมื่อ bookingState เปลี่ยน (กรณี auto-fill)
  useEffect(() => {
    const normalized = bookingState.customerPhone.replace(/\D/g, '');
    const regex = /^0[689]\d{8}$/;
    setIsValidPhone(regex.test(normalized) || normalized.length === 0);
  }, [bookingState.customerPhone]);

  const normalizedPhone = bookingState.customerPhone.replace(/\D/g, '');
  const formattedPhone = formatPhoneNumber(normalizedPhone);
  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    normalizedPhone.length === 10 &&
    isValidPhone;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-primary-100 p-3 rounded-full text-primary-600">
          <CheckCircle2 size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-800">ยืนยันการจอง</h2>
          <p className="text-base text-stone-500">ตรวจสอบข้อมูลก่อนยืนยันนะคะ</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 space-y-4">
        <div className="flex justify-between border-b border-stone-100 pb-3">
          <span className="text-stone-500">สาขา</span>
          <span className="font-bold text-stone-800 text-right">{bookingState.branch?.name}</span>
        </div>
        <div className="flex justify-between border-b border-stone-100 pb-3">
          <span className="text-stone-500">บริการ</span>
          <span className="font-bold text-stone-800">{bookingState.service?.name}</span>
        </div>
        <div className="flex justify-between border-b border-stone-100 pb-3">
          <span className="text-stone-500">วันที่</span>
          <span className="font-bold text-stone-800">
            {bookingState.date ? formatThaiDate(bookingState.date) : '-'}
          </span>
        </div>
        <div className="flex justify-between border-b border-stone-100 pb-3">
          <span className="text-stone-500">เวลา</span>
          <span className="font-bold text-stone-800">{bookingState.timeSlot?.time} น.</span>
        </div>
        <div className="flex justify-between border-b border-stone-100 pb-3">
          <span className="text-stone-500">พนักงาน</span>
          <span className="font-bold text-stone-800">{bookingState.staff?.name}</span>
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="text-lg font-bold text-stone-800">ราคา</span>
          <span className="text-2xl font-bold text-primary-600">{bookingState.service?.price} บาท</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="block text-base font-medium text-stone-700 mb-2">ชื่อ</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => {
                const value = e.target.value;
                setFirstName(value);
                onChange('customerName', `${value} ${lastName}`.trim());
              }}
              className="w-full px-5 py-4 rounded-xl border-2 border-stone-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-lg"
              placeholder="เช่น สมชาย"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-base font-medium text-stone-700 mb-2">นามสกุล</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => {
                const value = e.target.value;
                setLastName(value);
                onChange('customerName', `${firstName} ${value}`.trim());
              }}
              className="w-full px-5 py-4 rounded-xl border-2 border-stone-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-lg"
              placeholder="เช่น ใจดี"
              disabled={isLoading}
            />
          </div>
        </div>
        <div>
          <label className="block text-base font-medium text-stone-700 mb-2">เบอร์โทรศัพท์ (มือถือ 10 หลัก)</label>
          <div className="relative">
             <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
             <input
              type="tel"
              value={formattedPhone}
              onChange={handlePhoneChange}
              maxLength={12} // 10 digits + 2 hyphens
              className={`w-full pl-12 pr-5 py-4 rounded-xl border-2 outline-none text-lg tracking-wide font-mono ${!isValidPhone && bookingState.customerPhone.length > 0 ? 'border-red-500 focus:border-red-500 text-red-600' : 'border-stone-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500'}`}
              placeholder="0xx-xxx-xxxx"
              disabled={isLoading}
            />
          </div>
          {!isValidPhone && bookingState.customerPhone.length > 0 && (
            <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
              <AlertCircle size={16} /> กรุณากรอกเบอร์มือถือให้ถูกต้อง (เช่น 0812345678)
            </p>
          )}
        </div>
      </div>

      <Button 
        fullWidth 
        onClick={onConfirm} 
        disabled={!canSubmit || isLoading}
        className="mt-4 !py-4 !text-xl !font-bold flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" />
            กำลังบันทึกข้อมูล...
          </>
        ) : (
          'ยืนยันการจอง'
        )}
      </Button>
    </div>
  );
};
