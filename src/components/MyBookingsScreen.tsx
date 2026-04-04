// Booking Step: My Bookings (ขั้นตอน: การจองของฉัน)
import React, { useState } from 'react';
import { BookingHistory } from '../types';
import { MOCK_BOOKING_HISTORY } from '../constants';
import { formatPhoneNumber, formatThaiDateString } from '../utils';
import { Button } from './Button';
import { SuccessScreen } from './SuccessScreen';
import { Ticket, Search, ChevronLeft, Calendar, Clock } from 'lucide-react';

interface MyBookingsScreenProps {
  onBack: () => void;
}

export const MyBookingsScreen: React.FC<MyBookingsScreenProps> = ({ onBack }) => {
  const [phone, setPhone] = useState('');
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<BookingHistory[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingHistory | null>(null);

  const handleSearch = () => {
    if (phone.length < 10) return;
    setSearched(true);
    // Remove hyphens for search
    const cleanPhone = phone.replace(/-/g, '');
    const found = MOCK_BOOKING_HISTORY.filter(b => b.customerPhone === cleanPhone);
    setResults(found);
    setSelectedBooking(null);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const truncated = raw.slice(0, 10);
    setPhone(formatPhoneNumber(truncated));
    setSearched(false); 
  };

  // If a booking is selected, show ticket view
  if (selectedBooking) {
    return (
      <div className="animate-fade-in">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => setSelectedBooking(null)} className="pl-0">
             <ChevronLeft size={20} className="mr-1"/> กลับไปรายการ
          </Button>
        </div>
        <SuccessScreen 
          bookingId={selectedBooking.id} 
          onHome={() => setSelectedBooking(null)}
          onCheckHistory={() => setSelectedBooking(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-primary-100 p-3 rounded-full text-primary-600">
          <Ticket size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-800">การจองของฉัน</h2>
          <p className="text-base text-stone-500">กรอกเบอร์โทรศัพท์เพื่อค้นหา</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 space-y-4">
        <div>
          <label className="block text-base font-medium text-stone-700 mb-2">เบอร์โทรศัพท์</label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="0xx-xxx-xxxx"
              className="flex-1 px-5 py-3 rounded-xl border-2 border-stone-200 focus:border-primary-500 outline-none text-lg font-mono tracking-wide"
            />
            <Button onClick={handleSearch} disabled={phone.replace(/\D/g,'').length !== 10}>
              <Search size={24} />
            </Button>
          </div>
        </div>
      </div>

      {searched && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-stone-700 px-2">
            {results.length > 0 ? 'รายการจองของคุณ' : 'ไม่พบข้อมูลการจอง'}
          </h3>
          
          {results.map(booking => (
            <div 
              key={booking.id}
              onClick={() => setSelectedBooking(booking)}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex justify-between items-center hover:border-primary-400 cursor-pointer active:scale-98 transition-all relative overflow-hidden group"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-500"></div>
              <div>
                <div className="text-primary-700 font-bold mb-1">{booking.serviceName}</div>
                <div className="text-stone-500 text-sm flex items-center gap-2">
                  <Calendar size={14}/> {formatThaiDateString(booking.date)}
                </div>
                <div className="text-stone-500 text-sm flex items-center gap-2">
                   <Clock size={14}/> {booking.time} น.
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs font-bold px-2 py-1 rounded-full mb-2 inline-block ${
                  booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                  booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-500'
                }`}>
                  {booking.status === 'completed' ? 'ใช้บริการแล้ว' : 'ยืนยันแล้ว'}
                </div>
                <div className="text-stone-300 group-hover:text-primary-500 transition-colors">
                  <ChevronLeft size={20} className="rotate-180" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
