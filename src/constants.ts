import { Service, Staff, TimeSlot, ShopConfig, StaffSchedule, Branch, BookingHistory } from './types';

export const BRANCHES: Branch[] = [
  {
    id: 'b-wangthong',
    name: 'สาขาวังทอง',
    location: '444 หมู่ 1 ต.วังทอง อ.วังทอง จ.พิษณุโลก',
    image: 'https://picsum.photos/seed/wangthong/800/600',
    availableServices: ['thai-traditional', 'aroma-oil', 'foot-massage', 'office-syndrome']
  },
  {
    id: 'b-huaro',
    name: 'สาขาหัวรอ',
    location: '59/2 หมู่ 6 ต.หัวรอ อ.เมือง จ.พิษณุโลก',
    image: 'https://picsum.photos/seed/huaro/800/600',
    availableServices: ['thai-traditional', 'aroma-oil', 'foot-massage', 'office-syndrome']
  },
  {
    id: 'b-bangphayom',
    name: 'สาขาบางพยอม',
    location: '123 หมู่ 4 ต.บางพยอม อ.เมือง จ.พิษณุโลก',
    image: 'https://picsum.photos/seed/bangphayom/800/600',
    availableServices: ['thai-traditional', 'aroma-oil', 'foot-massage', 'office-syndrome']
  },
];

export const SERVICES: Service[] = [
  {
    id: 'thai-traditional',
    name: 'นวดแผนไทย',
    description: 'การนวดกดจุดและยืดเหยียดกล้ามเนื้อ เพื่อผ่อนคลายความตึงเครียดและปรับสมดุลร่างกาย',
    duration: 60,
    price: 500,
    image: 'https://picsum.photos/400/300?random=1'
  },
  {
    id: 'aroma-oil',
    name: 'นวดน้ำมันอโรมา',
    description: 'นวดผ่อนคลายด้วยน้ำมันหอมระเหย ช่วยกระตุ้นการไหลเวียนโลหิตและบำรุงผิวพรรณ',
    duration: 90,
    price: 1200,
    image: 'https://picsum.photos/400/300?random=2'
  },
  {
    id: 'foot-massage',
    name: 'นวดฝ่าเท้า',
    description: 'กระตุ้นจุดสะท้อนที่ฝ่าเท้า เพื่อส่งเสริมการทำงานของอวัยวะต่างๆ ภายในร่างกาย',
    duration: 60,
    price: 450,
    image: 'https://picsum.photos/400/300?random=3'
  },
  {
    id: 'office-syndrome',
    name: 'นวดแก้ออฟฟิศซินโดรม',
    description: 'เน้นเฉพาะจุด คอ บ่า ไหล่ เพื่อบรรเทาอาการปวดเมื่อยจากการนั่งทำงานนานๆ',
    duration: 60,
    price: 600,
    image: 'https://picsum.photos/400/300?random=4'
  }
];

export const STAFF_MEMBERS: Staff[] = [
  {
    id: 's-somchai',
    name: 'หมอสมชาย',
    role: 'ผู้เชี่ยวชาญการนวดไทย',
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
    specialty: ['thai-traditional', 'foot-massage']
  },
  {
    id: 's-anna',
    name: 'หมอแอนนา',
    role: 'ผู้เชี่ยวชาญอโรมา',
    image: 'https://randomuser.me/api/portraits/women/44.jpg',
    specialty: ['aroma-oil', 'office-syndrome']
  },
  {
    id: 's-lek',
    name: 'หมอเล็ก',
    role: 'หมอนวดอาวุโส',
    image: 'https://randomuser.me/api/portraits/women/68.jpg',
    specialty: ['thai-traditional', 'office-syndrome', 'foot-massage']
  },
  {
    id: 's-keng',
    name: 'หมอเก่ง',
    role: 'นักกายภาพบำบัด',
    image: 'https://randomuser.me/api/portraits/men/85.jpg',
    specialty: ['office-syndrome', 'thai-traditional']
  }
];

export const SHOP_CONFIG: ShopConfig = {
  openTime: 10,
  closeTime: 20,
  holidays: ['2025-12-05', '2025-12-31'],
  slotInterval: 60 // 60 minutes
};

export const STAFF_SCHEDULES: { [key: string]: StaffSchedule } = {
  's-somchai': {
    staffId: 's-somchai',
    offDays: ['2025-12-06'],
    busySlots: {
      '2025-12-09': ['10:00', '14:00']
    }
  },
  's-anna': {
    staffId: 's-anna',
    offDays: ['2025-12-07'],
    busySlots: {}
  }
};

export const GENERATE_TIME_SLOTS = (config: ShopConfig): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const startHour = config.openTime;
  const endHour = config.closeTime;
  const interval = config.slotInterval;

  // Convert hours to minutes for easier calculation
  let currentMinutes = startHour * 60;
  const endMinutes = endHour * 60;

  while (currentMinutes < endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    
    // Format "HH:mm"
    const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    
    slots.push({
      id: `t-${timeString}`,
      time: timeString,
      available: true // Default to true, will be filtered by staff availability later
    });

    currentMinutes += interval;
  }

  return slots;
};

export const MOCK_BOOKING_HISTORY: BookingHistory[] = [
  {
    id: 'SS-251201-1234',
    branchName: 'สาขาวังทอง',
    serviceName: 'นวดแผนไทย',
    date: '2025-12-01T00:00:00.000Z',
    time: '14:00',
    staffName: 'หมอสมชาย',
    customerPhone: '0812345678',
    status: 'completed'
  },
  {
    id: 'SS-251215-5678',
    branchName: 'สาขาบางพยอม',
    serviceName: 'นวดน้ำมันอโรมา',
    date: '2025-12-15T00:00:00.000Z',
    time: '10:00',
    staffName: 'หมอแอนนา',
    customerPhone: '0812345678',
    status: 'confirmed'
  },
  {
    id: 'SS-251220-9999',
    branchName: 'สาขาหัวรอ',
    serviceName: 'นวดแก้ออฟฟิศซินโดรม',
    date: '2025-12-20T00:00:00.000Z',
    time: '16:00',
    staffName: 'หมอเก่ง',
    customerPhone: '0900000000',
    status: 'confirmed'
  }
];