import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Users, BookOpen, HelpCircle, FileCheck, Shield, CheckCircle2, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const currentUser = await requireRole(["ADMIN"]);

  // Fetch real counts from Database
  const [totalUsers, totalCourses, totalQuestions, totalExams, usersList] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.question.count(),
    prisma.exam.count(),
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentOrTeacherId: true,
        isActive: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm mb-1">
          <Shield className="w-4 h-4" /> แผงควบคุมผู้ดูแลระบบ
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          ยินดีต้อนรับ, {currentUser.name}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          ภาพรวมของระบบทดสอบออนไลน์และการจัดการข้อมูลผู้ใช้
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link
          href="/admin/users"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-purple-300 hover:shadow-md transition group"
        >
          <div>
            <p className="text-sm font-medium text-slate-500 group-hover:text-purple-600 transition">
              ผู้ใช้งานทั้งหมด
            </p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{totalUsers}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition">
            <Users className="w-6 h-6" />
          </div>
        </Link>

        <Link
          href="/admin/courses"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 hover:shadow-md transition group"
        >
          <div>
            <p className="text-sm font-medium text-slate-500 group-hover:text-blue-600 transition">
              รายวิชาทั้งหมด
            </p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{totalCourses}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
            <BookOpen className="w-6 h-6" />
          </div>
        </Link>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">ข้อสอบในคลัง</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{totalQuestions}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <HelpCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">ชุดแบบทดสอบ</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{totalExams}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">รายชื่อผู้ใช้งานล่าสุดในระบบ</h2>
            <p className="text-xs text-slate-500 mt-0.5">ดึงข้อมูลจริงจาก Database (Prisma)</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
            >
              จัดการผู้ใช้งานทั้งหมด
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">ชื่อ-นามสกุล</th>
                <th className="px-6 py-3.5">อีเมล</th>
                <th className="px-6 py-3.5">รหัสประจำตัว</th>
                <th className="px-6 py-3.5">บทบาท (Role)</th>
                <th className="px-6 py-3.5">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                  <td className="px-6 py-4">{u.email}</td>
                  <td className="px-6 py-4 font-mono text-xs">{u.studentOrTeacherId || "-"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.role === "ADMIN"
                          ? "bg-purple-100 text-purple-700"
                          : u.role === "TEACHER"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ใช้งานได้
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
