import type { ReactNode } from "react";
import Link from "next/link";

export default function BackofficeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-primary-800 text-primary-50 flex flex-col shadow-xl">
          <div className="px-4 py-4 border-b border-primary-600">
            <h1 className="text-lg font-semibold">Backoffice</h1>
            <p className="text-xs text-primary-200">
              กมลาศรม สสจ.พิษณุโลก
            </p>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1 text-sm">
            <Link
              href="/backoffice"
              className="block rounded-md px-3 py-2 hover:bg-primary-700 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/backoffice/branches"
              className="block rounded-md px-3 py-2 hover:bg-primary-700 transition-colors"
            >
              จัดการสาขา
            </Link>
            <Link
              href="/backoffice/services"
              className="block rounded-md px-3 py-2 hover:bg-primary-700 transition-colors"
            >
              จัดการบริการ
            </Link>
            <Link
              href="/backoffice/staff"
              className="block rounded-md px-3 py-2 hover:bg-primary-700 transition-colors"
            >
              จัดการพนักงาน
            </Link>
            <Link
              href="/backoffice/schedule"
              className="block rounded-md px-3 py-2 hover:bg-primary-700 transition-colors"
            >
              ตารางพนักงาน
            </Link>
            <Link
              href="/backoffice/bookings"
              className="block rounded-md px-3 py-2 hover:bg-primary-700 transition-colors"
            >
              รายการจอง
            </Link>
            <Link
              href="/backoffice/settings"
              className="block rounded-md px-3 py-2 hover:bg-primary-700 transition-colors"
            >
              ตั้งค่าร้าน (ShopConfig)
            </Link>
            <Link
              href="/backoffice/reports"
              className="block rounded-md px-3 py-2 hover:bg-primary-700 transition-colors"
            >
              รายงาน
            </Link>
          </nav>
          <div className="px-4 py-3 border-t border-primary-700 text-[11px] text-primary-200">
            ระบบหลังบ้าน
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-h-screen flex flex-col">
          <header className="border-b bg-white px-6 py-4 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">ระบบหลังบ้าน</h2>
              <p className="text-xs text-stone-500">
                จัดการสาขา บริการ พนักงาน และรายการจอง
              </p>
            </div>
          </header>
          <section className="flex-1 p-6">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}
