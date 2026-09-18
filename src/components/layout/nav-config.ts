import {
  LayoutDashboard,
  Users,
  BookOpen,
  Clock,
  FolderKanban,
  FileSpreadsheet,
} from "lucide-react";
import { UserSessionPayload } from "@/types/auth";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function getNavItems(user: UserSessionPayload): NavItem[] {
  if (user.role === "ADMIN") {
    return [
      { name: "แดชบอร์ดภาพรวม", href: "/admin/dashboard", icon: LayoutDashboard },
      { name: "รายวิชาทั้งหมด", href: "/admin/courses", icon: BookOpen },
      { name: "จัดการผู้ใช้งาน", href: "/admin/users", icon: Users },
    ];
  }

  if (user.role === "TEACHER") {
    return [
      { name: "แดชบอร์ด", href: "/instructor/dashboard", icon: LayoutDashboard },
      { name: "รายวิชาที่รับผิดชอบ", href: "/instructor/courses", icon: BookOpen },
      { name: "แบบทดสอบทั้งหมด", href: "/instructor/exams", icon: FileSpreadsheet },
    ];
  }

  return [
    { name: "แดชบอร์ดนักศึกษา", href: "/student/dashboard", icon: LayoutDashboard },
    { name: "รายวิชาที่ลงทะเบียน", href: "/student/courses", icon: FolderKanban },
    { name: "แบบทดสอบที่เปิดสอบ", href: "/student/exams", icon: Clock },
  ];
}

export function isNavItemActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/") return false;
  return pathname.startsWith(href + "/") || pathname.startsWith(href);
}
