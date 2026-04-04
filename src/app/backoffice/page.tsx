export default function BackofficeDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">
          Dashboard ระบบหลังบ้าน
        </h1>
        <p className="text-sm text-stone-500">
          มุมมองภาพรวมของสาขา บริการ พนักงาน และสถานะการจอง
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-stone-500">จำนวนสาขา</p>
          <p className="mt-2 text-2xl font-semibold text-primary-700">—</p>
          <p className="mt-1 text-[11px] text-stone-400">
            จะเชื่อมต่อกับข้อมูล Branch ในเฟสถัดไป
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-stone-500">จำนวนการจองวันนี้</p>
          <p className="mt-2 text-2xl font-semibold text-primary-700">—</p>
          <p className="mt-1 text-[11px] text-stone-400">
            จะเชื่อมต่อกับข้อมูล Booking ในเฟสถัดไป
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-stone-500">พนักงานที่เปิดกะวันนี้</p>
          <p className="mt-2 text-2xl font-semibold text-primary-700">—</p>
          <p className="mt-1 text-[11px] text-stone-400">
            จะเชื่อมต่อกับตาราง StaffSchedule ในเฟสถัดไป
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold mb-2">งานที่ต้องติดตาม</h2>
          <ul className="text-xs text-stone-600 list-disc list-inside space-y-1">
            <li>เชื่อมต่อข้อมูลจริงจาก Prisma (Branch, Booking, Staff)</li>
            <li>เพิ่ม filter ตามสาขาและวันที่</li>
          </ul>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold mb-2">ลิงก์ด่วน</h2>
          <ul className="text-xs text-primary-700 space-y-1">
            <li>ไปที่จัดการสาขา: /backoffice/branches</li>
            <li>ไปที่จัดการบริการ: /backoffice/services</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
