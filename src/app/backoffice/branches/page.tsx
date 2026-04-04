export default function BackofficeBranchesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight mb-1">จัดการสาขา</h1>
        <p className="text-sm text-stone-500">
          หน้านี้จะใช้จัดการข้อมูลสาขาและบริการที่ให้บริการในแต่ละสาขา ตามสเปกใน `.spec/backoffice`.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
        ตารางสาขาและฟอร์มแก้ไข/เพิ่มสาขาจะถูกเพิ่มในเฟสถัดไป
      </div>
    </div>
  );
}
