'use client';

import type { ReactNode } from "react";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { Menu, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { logout } from "@/app/actions/logout";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: session } = useSession();

  const displayName = useMemo(() => {
    const rawProfile = (session?.user as any)?.profile;
    try {
      const profile = typeof rawProfile === "string" ? JSON.parse(rawProfile) : rawProfile;
      // Prefer Provider ID fields
      if (profile?.name_th) return profile.name_th;
      if (profile?.firstname_th || profile?.lastname_th) {
        const combined = [profile.firstname_th, profile.lastname_th].filter(Boolean).join(" ").trim();
        if (combined) return combined;
      }
      // Fallback to generic profile fields
      if (profile?.fname || profile?.lname) {
        const combined = [profile.fname, profile.lname].filter(Boolean).join(" ").trim();
        if (combined) return combined;
      }
      if (profile?.name) return profile.name;
    } catch {
      // ignore parse errors
    }
    return session?.user?.name || "ผู้ดูแลระบบ";
  }, [session]);

  const displayPosition = useMemo(() => {
    const rawProfile = (session?.user as any)?.profile;
    try {
      const profile = typeof rawProfile === "string" ? JSON.parse(rawProfile) : rawProfile;
      // Try Provider ID organization position
      if (profile?.organization?.length) {
        const org = profile.organization[0];
        if (org?.position) return org.position;
      }
      if (profile?.position) return profile.position;
    } catch {
      // ignore parse errors
    }
    return null;
  }, [session]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const getPageTitle = () => {
    if (pathname === "/admin") return "Dashboard";
    if (pathname.startsWith("/admin/bookings")) return "รายการจอง";
    if (pathname.startsWith("/admin/booking-delete-logs")) return "ประวัติการลบการจอง";
    if (pathname.startsWith("/admin/branches")) return "สาขา";
    if (pathname.startsWith("/admin/services")) return "บริการ";
    if (pathname.startsWith("/admin/staff-holidays")) return "พนักงานลาหยุด";
    if (pathname.startsWith("/admin/staff")) return "พนักงาน";
    if (pathname.startsWith("/admin/schedule")) return "ตารางหยุดพนักงาน";
    if (pathname.startsWith("/admin/reports")) return "รายงาน";
    if (pathname.startsWith("/admin/opening-hours")) return "ตั้งค่าเวลา";
    if (pathname.startsWith("/admin/settings")) return "ตั้งค่าการจอง";
    if (pathname.startsWith("/admin/notifications")) return "ตั้งค่าการแจ้งเตือน";
    if (pathname.startsWith("/admin/broadcasts")) return "การส่ง Broadcast";
    if (pathname.startsWith("/admin/users")) return "จัดการผู้ใช้งาน";
    return "Admin Console";
  };

  const getPageIcon = () => {
    if (pathname === "/admin") return "mdi:view-dashboard-outline";
    if (pathname.startsWith("/admin/bookings")) return "solar:calendar-linear";
    if (pathname.startsWith("/admin/branches")) return "solar:buildings-3-linear";
    if (pathname.startsWith("/admin/services")) return "solar:list-linear";
    if (pathname.startsWith("/admin/staff-holidays")) return "solar:calendar-mark-linear";
    if (pathname.startsWith("/admin/staff")) return "solar:users-group-two-rounded-outline";
    if (pathname.startsWith("/admin/schedule")) return "solar:clock-circle-outline";
    if (pathname.startsWith("/admin/reports")) return "solar:chart-square-linear";
    if (pathname.startsWith("/admin/opening-hours")) return "solar:clock-circle-linear";
    if (pathname.startsWith("/admin/settings")) return "solar:settings-linear";
    if (pathname.startsWith("/admin/notifications")) return "solar:bell-bold";
    if (pathname.startsWith("/admin/broadcasts")) return "solar:radio-bold";
    if (pathname.startsWith("/admin/users")) return "solar:user-id-bold";
    return "mdi:view-dashboard-outline";
  };

  const getHeaderColor = () => {
    // สีฟุ้งกระจายสำหรับแต่ละเมนู (ไม่ซ้ำกัน)
    if (pathname === "/admin") {
      return {
        shadow: "shadow-blue-200/30",
        dots: ["bg-blue-300/20", "bg-blue-400/25", "bg-blue-200/30", "bg-blue-300/20"],
      };
    }
    if (pathname.startsWith("/admin/bookings")) {
      return {
        shadow: "shadow-emerald-200/30",
        dots: ["bg-emerald-300/20", "bg-emerald-400/25", "bg-emerald-200/30", "bg-emerald-300/20"],
      };
    }
    if (pathname.startsWith("/admin/branches")) {
      return {
        shadow: "shadow-indigo-200/30",
        dots: ["bg-indigo-300/20", "bg-indigo-400/25", "bg-indigo-200/30", "bg-indigo-300/20"],
      };
    }
    if (pathname.startsWith("/admin/services")) {
      return {
        shadow: "shadow-pink-200/30",
        dots: ["bg-pink-300/20", "bg-pink-400/25", "bg-pink-200/30", "bg-pink-300/20"],
      };
    }
    if (pathname.startsWith("/admin/staff")) {
      return {
        shadow: "shadow-orange-200/30",
        dots: ["bg-orange-300/20", "bg-orange-400/25", "bg-orange-200/30", "bg-orange-300/20"],
      };
    }
    if (pathname.startsWith("/admin/schedule")) {
      return {
        shadow: "shadow-cyan-200/30",
        dots: ["bg-cyan-300/20", "bg-cyan-400/25", "bg-cyan-200/30", "bg-cyan-300/20"],
      };
    }
    if (pathname.startsWith("/admin/reports")) {
      return {
        shadow: "shadow-purple-200/30",
        dots: ["bg-purple-300/20", "bg-purple-400/25", "bg-purple-200/30", "bg-purple-300/20"],
      };
    }
    if (pathname.startsWith("/admin/opening-hours")) {
      return {
        shadow: "shadow-teal-200/30",
        dots: ["bg-teal-300/20", "bg-teal-400/25", "bg-teal-200/30", "bg-teal-300/20"],
      };
    }
    if (pathname.startsWith("/admin/settings")) {
      return {
        shadow: "shadow-amber-200/30",
        dots: ["bg-amber-300/20", "bg-amber-400/25", "bg-amber-200/30", "bg-amber-300/20"],
      };
    }
    if (pathname.startsWith("/admin/notifications")) {
      return {
        shadow: "shadow-violet-200/30",
        dots: ["bg-violet-300/20", "bg-violet-400/25", "bg-violet-200/30", "bg-violet-300/20"],
      };
    }
    if (pathname.startsWith("/admin/broadcasts")) {
      return {
        shadow: "shadow-rose-200/30",
        dots: ["bg-rose-300/20", "bg-rose-400/25", "bg-rose-200/30", "bg-rose-300/20"],
      };
    }
    // default: purple
    return {
      shadow: "shadow-purple-200/30",
      dots: ["bg-purple-300/20", "bg-purple-400/25", "bg-purple-200/30", "bg-purple-300/20"],
    };
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Top app bar (ERP style) - fixed, glassy */}
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/40 bg-white/25 shadow-lg shadow-slate-200/40 backdrop-blur-3xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-2 py-2 text-xs text-slate-700 sm:px-3 lg:px-4">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-slate-700 ring-1 ring-white/40 backdrop-blur-sm transition hover:bg-white/30 lg:hidden"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-600 text-xs font-semibold text-white sm:h-12 sm:w-12">
              BK
            </div>

            <div>
              <h1 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg md:text-xl">
                Backoffice Console
              </h1>
              <p className="text-[11px] text-slate-500 sm:text-xs md:text-sm">
                กมลาศรม สสจ.พิษณุโลก
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <span className="inline-flex items-start gap-2 rounded-full bg-white/40 px-3 py-1.5 text-[11px] font-medium text-slate-600 ring-1 ring-white/60 backdrop-blur-sm sm:text-xs">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="flex flex-col leading-tight">
                <span>{displayName}</span>
                {displayPosition && (
                  <span className="mt-0.5 text-[10px] font-normal text-stone-500">
                    {displayPosition}
                  </span>
                )}
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* Shell */}
      <div className="mx-auto flex min-h-screen max-w-6xl lg:max-w-7xl xl:max-w-[1600px] gap-6 px-4 lg:px-6 xl:px-8 pb-6 pt-16">
        {/* Sidebar as single white navbar card (sticky) */}
        <aside className="hidden w-56 shrink-0 self-start text-xs text-stone-700 md:flex md:sticky md:top-20">
          <nav className="flex flex-1 flex-col gap-1.5 rounded-2xl bg-white px-3.5 py-3 shadow-sm text-[13px]">
            {/* Header inside card */}
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/80 text-[11px] font-semibold text-amber-950">
                A
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-700">
                  Admin Console
                </span>
                <span className="text-[10px] text-stone-500 leading-tight">
                  ระบบจัดการหลังบ้าน
                </span>
              </div>
            </div>

            <div className="h-px w-full bg-stone-100" />
            <Link
              href="/admin"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${pathname === "/admin"
                ? "bg-linear-to-t from-[#C8CCFC] to-[#F3F3FB] text-purple-800"
                : "text-stone-800 hover:bg-stone-50"
                }`}
            >
              <Icon
                icon="mdi:view-dashboard-outline"
                className={`h-4 w-4 ${pathname === "/admin" ? "text-purple-800" : "text-stone-500"
                  }`}
              />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/admin/bookings"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${isActive("/admin/bookings")
                ? "bg-linear-to-t from-[#C8CCFC] to-[#F3F3FB] text-purple-800"
                : "text-stone-800 hover:bg-stone-50"
                }`}
            >
              <Icon
                icon="solar:calendar-linear"
                className={`h-4 w-4 ${isActive("/admin/bookings")
                  ? "text-purple-800"
                  : "text-stone-500"
                  }`}
              />
              <span>รายการจอง</span>
            </Link>
            <Link
              href="/admin/booking-delete-logs"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${isActive("/admin/booking-delete-logs")
                ? "bg-linear-to-t from-[#C8CCFC] to-[#F3F3FB] text-purple-800"
                : "text-stone-800 hover:bg-stone-50"
                }`}
            >
              <Icon
                icon="solar:trash-bin-trash-linear"
                className={`h-4 w-4 ${isActive("/admin/booking-delete-logs")
                  ? "text-purple-800"
                  : "text-stone-500"
                  }`}
              />
              <span>ประวัติการลบ</span>
            </Link>
            <Link
              href="/admin/branches"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${isActive("/admin/branches")
                ? "bg-linear-to-t from-[#C8CCFC] to-[#F3F3FB] text-purple-800"
                : "text-stone-800 hover:bg-stone-50"
                }`}
            >
              <Icon
                icon="solar:buildings-3-linear"
                className={`h-4 w-4 ${isActive("/admin/branches")
                  ? "text-purple-800"
                  : "text-stone-500"
                  }`}
              />
              <span>สาขา</span>
            </Link>
            <Link
              href="/admin/services"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${isActive("/admin/services")
                ? "bg-linear-to-t from-[#C8CCFC] to-[#F3F3FB] text-purple-800"
                : "text-stone-800 hover:bg-stone-50"
                }`}
            >
              <Icon
                icon="solar:list-linear"
                className={`h-4 w-4 ${isActive("/admin/services")
                  ? "text-purple-800"
                  : "text-stone-500"
                  }`}
              />
              <span>บริการ</span>
            </Link>
            <Link
              href="/admin/staff"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${isActive("/admin/staff")
                ? "bg-linear-to-t from-[#C8CCFC] to-[#F3F3FB] text-purple-800"
                : "text-stone-800 hover:bg-stone-50"
                }`}
            >
              <Icon
                icon="solar:users-group-rounded-linear"
                className={`h-4 w-4 ${isActive("/admin/staff")
                  ? "text-purple-800"
                  : "text-stone-500"
                  }`}
              />
              <span>พนักงาน</span>
            </Link>
            {/* <Link
              href="/admin/schedule"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${isActive("/admin/schedule")
                ? "bg-linear-to-t from-[#C8CCFC] to-[#F3F3FB] text-purple-800"
                : "text-stone-800 hover:bg-stone-50"
                }`}
            >
              <Icon
                icon="solar:clock-circle-outline"
                className={`h-4 w-4 ${isActive("/admin/schedule")
                  ? "text-purple-800"
                  : "text-stone-500"
                  }`}
              />
              <span>ตารางหยุดพนักงาน</span>
            </Link> */}
            <Link
              href="/admin/staff-holidays"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${isActive("/admin/staff-holidays")
                ? "bg-linear-to-t from-[#C8CCFC] to-[#F3F3FB] text-purple-800"
                : "text-stone-800 hover:bg-stone-50"
                }`}
            >
              <Icon
                icon="solar:calendar-mark-linear"
                className={`h-4 w-4 ${isActive("/admin/staff-holidays")
                  ? "text-purple-800"
                  : "text-stone-500"
                  }`}
              />
              <span>พนักงานลาหยุด</span>
            </Link>
            <Link
              href="/admin/opening-hours"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${isActive("/admin/opening-hours")
                ? "bg-linear-to-t from-[#C8CCFC] to-[#F3F3FB] text-purple-800"
                : "text-stone-800 hover:bg-stone-50"
                }`}
            >
              <Icon
                icon="solar:clock-circle-linear"
                className={`h-4 w-4 ${isActive("/admin/opening-hours")
                  ? "text-purple-800"
                  : "text-stone-500"
                  }`}
              />
              <span>ตั้งค่าเวลา</span>
            </Link>
            <Link
              href="/admin/reports"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${isActive("/admin/reports")
                ? "bg-linear-to-t from-[#C8CCFC] to-[#F3F3FB] text-purple-800"
                : "text-stone-800 hover:bg-stone-50"
                }`}
            >
              <Icon
                icon="solar:chart-square-linear"
                className={`h-4 w-4 ${isActive("/admin/reports")
                  ? "text-purple-800"
                  : "text-stone-500"
                  }`}
              />
              <span>รายงาน</span>
            </Link>
            <Link
              href="/admin/settings"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${isActive("/admin/settings")
                ? "bg-linear-to-t from-[#C8CCFC] to-[#F3F3FB] text-purple-800"
                : "text-stone-800 hover:bg-stone-50"
                }`}
            >
              <Icon
                icon="solar:settings-linear"
                className={`h-4 w-4 ${isActive("/admin/settings")
                  ? "text-purple-800"
                  : "text-stone-500"
                  }`}
              />
              <span>ตั้งค่าการจอง</span>
            </Link>
            <Link
              href="/admin/notifications"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${isActive("/admin/notifications")
                ? "bg-linear-to-t from-[#C8CCFC] to-[#F3F3FB] text-purple-800"
                : "text-stone-800 hover:bg-stone-50"
                }`}
            >
              <Icon
                icon="solar:bell-bold"
                className={`h-4 w-4 ${isActive("/admin/notifications")
                  ? "text-purple-800"
                  : "text-stone-500"
                  }`}
              />
              <span>ตั้งค่าการแจ้งเตือน</span>
            </Link>
            <Link
              href="/admin/broadcasts"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${isActive("/admin/broadcasts")
                ? "bg-linear-to-t from-[#C8CCFC] to-[#F3F3FB] text-purple-800"
                : "text-stone-800 hover:bg-stone-50"
                }`}
            >
              <Icon
                icon="solar:radio-bold"
                className={`h-4 w-4 ${isActive("/admin/broadcasts")
                  ? "text-purple-800"
                  : "text-stone-500"
                  }`}
              />
              <span>การส่ง Broadcast</span>
            </Link>
            <Link
              href="/admin/faq"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${isActive("/admin/faq")
                ? "bg-linear-to-t from-[#C8CCFC] to-[#F3F3FB] text-purple-800"
                : "text-stone-800 hover:bg-stone-50"
                }`}
            >
              <Icon
                icon="solar:question-circle-bold"
                className={`h-4 w-4 ${isActive("/admin/faq")
                  ? "text-purple-800"
                  : "text-stone-500"
                  }`}
              />
              <span>คำถามพบบ่อย</span>
            </Link>
            <Link
              href="/admin/users"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${isActive("/admin/users")
                ? "bg-linear-to-t from-[#C8CCFC] to-[#F3F3FB] text-purple-800"
                : "text-stone-800 hover:bg-stone-50"
                }`}
            >
              <Icon
                icon="solar:user-id-bold"
                className={`h-4 w-4 ${isActive("/admin/users")
                  ? "text-purple-800"
                  : "text-stone-500"
                  }`}
              />
              <span>จัดการผู้ใช้งาน</span>
            </Link>
            <div className="h-px w-full bg-stone-100 my-1" />
            <form action={logout} className="w-full">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-stone-800 hover:bg-stone-50 transition-colors"
              >
                <Icon icon="solar:logout-2-bold" className="h-4 w-4 text-stone-500" />
                <span>ออกจากระบบ</span>
              </button>
            </form>
          </nav>
        </aside>

        {/* Main area */}
        <main className="flex-1">
          <header className={`relative mb-4 mt-4 flex items-center justify-between overflow-hidden rounded-lg bg-white/60 px-4 py-3 shadow-sm backdrop-blur-md border border-white/40 ${getHeaderColor().shadow}`}>
            {/* สีฟุ้งกระจายเป็นจุดๆ ตามเมนูที่เลือก */}
            <div className="absolute inset-0 z-0">
              <div className={`absolute left-1/4 top-0 h-32 w-32 rounded-full ${getHeaderColor().dots[0]} blur-3xl`} />
              <div className={`absolute right-1/3 top-1/2 h-24 w-24 rounded-full ${getHeaderColor().dots[1]} blur-2xl`} />
              <div className={`absolute left-0 bottom-0 h-20 w-20 rounded-full ${getHeaderColor().dots[2]} blur-2xl`} />
              <div className={`absolute right-1/4 bottom-1/3 h-28 w-28 rounded-full ${getHeaderColor().dots[3]} blur-3xl`} />
            </div>
            <div className="relative z-10 flex w-full items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-white shadow-sm">
                    <Icon icon={getPageIcon()} className="h-4 w-4" />
                  </div>
                  <h1 className="text-sm font-semibold tracking-tight">
                    {getPageTitle()}
                  </h1>
                </div>
              </div>
            </div>
          </header>

          <section className="rounded-lg bg-white p-4 shadow-sm">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}


