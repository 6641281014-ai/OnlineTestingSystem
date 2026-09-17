"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Clock,
  FolderKanban,
} from "lucide-react";
import { UserSessionPayload } from "@/types/auth";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface SidebarProps {
  user: UserSessionPayload;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const adminNav: NavItem[] = [
    { name: "แดชบอร์ดภาพรวม", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "รายวิชาทั้งหมด", href: "/admin/courses", icon: BookOpen },
    { name: "จัดการผู้ใช้งาน", href: "/admin/users", icon: Users },
  ];

  const teacherNav: NavItem[] = [
    { name: "แดชบอร์ด", href: "/instructor/dashboard", icon: LayoutDashboard },
    { name: "รายวิชาที่รับผิดชอบ", href: "/instructor/courses", icon: BookOpen },
  ];

  const studentNav: NavItem[] = [
    { name: "แดชบอร์ดนักศึกษา", href: "/student/dashboard", icon: LayoutDashboard },
    { name: "รายวิชาที่ลงทะเบียน", href: "/student/courses", icon: FolderKanban },
    { name: "แบบทดสอบที่เปิดสอบ", href: "/student/exams", icon: Clock },
  ];

  const currentNav =
    user.role === "ADMIN"
      ? adminNav
      : user.role === "TEACHER"
      ? teacherNav
      : studentNav;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          เมนูหลัก ({user.role})
        </div>
        {currentNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "#" && pathname.startsWith(item.href) && item.href !== "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-500">
        <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          ระบบทดสอบออนไลน์
        </div>
        <div className="text-[11px] text-slate-400">ประเมินผลสัมฤทธิ์ทางการเรียน</div>
      </div>
    </aside>
  );
}
