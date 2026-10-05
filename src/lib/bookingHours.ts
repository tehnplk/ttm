export const BOOKING_HOURS_MESSAGE = 'เปิดให้ทำการจองเฉพาะช่วงเวลา 6.00 - 23.59 น.';

// เปิดจอง 06:00 - 23:59 ตามเวลาไทย
export function isWithinBookingHours(now = new Date()): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', hour: 'numeric', hourCycle: 'h23' }).format(now)
  );
  return hour >= 6;
}
