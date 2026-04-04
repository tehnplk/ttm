export default function BackofficeSettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight mb-1">ตั้งค่าร้าน (ShopConfig)</h1>
        <p className="text-sm text-stone-500">
          หน้านี้จะใช้จัดการค่า `openTime`, `closeTime`, `slotInterval` และ `holidays` ตามสเปกใน `.spec/backoffice`.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
        ฟอร์มตั้งค่า ShopConfig และการบันทึกลงฐานข้อมูลจะถูกเพิ่มในเฟสถัดไป
      </div>
    </div>
  );
}
