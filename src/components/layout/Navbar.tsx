"use client";

import { useRouter } from "next/navigation";
import { GraduationCap, LogOut, User as UserIcon } from "lucide-react";
import { UserSessionPayload } from "@/types/auth";

interface NavbarProps {
  user: UserSessionPayload;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-purple-200">ผู้ดูแลระบบ (Admin)</span>;
      case "TEACHER":
        return <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">อาจารย์ผู้สอน (Teacher)</span>;
      case "STUDENT":
        return <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">นักศึกษา (Student)</span>;
      default:
        return null;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight">
            ระบบทดสอบออนไลน์
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            Online Testing System for Evaluating Academic Achievement
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-right">
            <div className="text-sm font-semibold text-slate-800 leading-none mb-1">
              {user.name}
            </div>
            {getRoleBadge(user.role)}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition flex items-center gap-1 text-sm font-medium border border-transparent hover:border-rose-200"
          title="ออกจากระบบ"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">ออกจากระบบ</span>
        </button>
      </div>
    </header>
  );
}
