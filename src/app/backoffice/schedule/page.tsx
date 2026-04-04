export default function BackofficeSchedulePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight mb-1">ตารางพนักงาน</h1>
        <p className="text-sm text-stone-500">
          หน้านี้จะใช้จัดการวันหยุด (offDays) และช่วงเวลาที่ไม่ว่าง (busySlots) ของพนักงาน ตามสเปกใน `.spec/backoffice`.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
        ปฏิทินตารางงานของพนักงานจะถูกออกแบบและเชื่อมต่อกับ StaffSchedule ในเฟสถัดไป
      </div>
    </div>
  );
}
