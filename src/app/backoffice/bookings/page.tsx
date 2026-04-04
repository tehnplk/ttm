import { listBookings } from "@/lib/backoffice/booking-service";

function formatDateTime(date: Date, time: string) {
  try {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return `${dateStr} • ${time}`;
  } catch {
    return time;
  }
}

export default async function BackofficeBookingsPage() {
  const bookings = await listBookings();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight mb-1">รายการจอง</h1>
        <p className="text-sm text-stone-500">
          ดูและตรวจสอบรายการจองจากทุกสาขา ข้อมูลนี้ดึงจากฐานข้อมูลผ่าน Prisma ตามสเปกใน `.spec/backoffice`.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        {bookings.length === 0 ? (
          <p className="text-sm text-stone-500">ยังไม่มีรายการจองในระบบ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-stone-50 text-[11px] uppercase text-stone-500">
                  <th className="px-3 py-2 text-left font-medium">วันที่ / เวลา</th>
                  <th className="px-3 py-2 text-left font-medium">สาขา</th>
                  <th className="px-3 py-2 text-left font-medium">บริการ</th>
                  <th className="px-3 py-2 text-left font-medium">พนักงาน</th>
                  <th className="px-3 py-2 text-left font-medium">ลูกค้า</th>
                  <th className="px-3 py-2 text-left font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    className="border-t border-stone-100 hover:bg-stone-50/80 transition-colors"
                  >
                    <td className="px-3 py-2 align-top text-stone-800">
                      {formatDateTime(b.date, b.time)}
                    </td>
                    <td className="px-3 py-2 align-top text-stone-800">
                      {b.branchName}
                    </td>
                    <td className="px-3 py-2 align-top text-stone-800">
                      {b.serviceName}
                    </td>
                    <td className="px-3 py-2 align-top text-stone-800">
                      {b.staffName}
                    </td>
                    <td className="px-3 py-2 align-top text-stone-800">
                      <div className="flex flex-col text-xs">
                        <span className="font-medium">{b.customerName}</span>
                        <span className="text-stone-500">{b.customerPhone}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          b.status === "confirmed"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : b.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : b.status === "cancelled"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-stone-100 text-stone-700 border border-stone-200"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
