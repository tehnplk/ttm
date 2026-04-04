export default function BackofficeReportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight mb-1">รายงาน</h1>
        <p className="text-sm text-stone-500">
          หน้านี้จะใช้แสดงรายงานจำนวนการจองตามช่วงเวลา/บริการ/สาขา ตามสเปกใน `.spec/backoffice`.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
        ตาราง/กราฟรายงานจะถูกออกแบบและเชื่อมต่อข้อมูลจริงในเฟสถัดไป
      </div>
    </div>
  );
}
