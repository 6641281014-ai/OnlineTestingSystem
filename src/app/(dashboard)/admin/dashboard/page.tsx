import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import {
  Users,
  BookOpen,
  HelpCircle,
  FileCheck,
  Shield,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  GraduationCap,
  Layers,
  Award,
  Activity,
  Sparkles,
  Lock,
  UserCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const currentUser = await requireRole(["ADMIN"]);

  // Fetch real counts & analytics from Database
  const [
    totalUsers,
    studentCount,
    teacherCount,
    adminCount,
    totalCourses,
    totalQuestionSets,
    totalQuestions,
    totalExams,
    totalAttempts,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.course.count(),
    prisma.questionSet.count(),
    prisma.question.count(),
    prisma.exam.count(),
    prisma.examAttempt.count(),
    prisma.user.findMany({
      take: 8,
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
      {/* 1. Academic Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <span className="flex items-center gap-1 text-slate-500">
          <Shield className="w-3.5 h-3.5 text-indigo-600" /> ศูนย์บริหารจัดการระบบ
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-700 font-semibold">แดชบอร์ดภาพรวมสถาบัน</span>
      </nav>

      {/* 2. Executive Hero Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                <Shield className="w-3.5 h-3.5" /> Institutional System Administrator
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                ระบบทำงานปกติ • Anti-Cheat Engine Active
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              ยินดีต้อนรับ, {currentUser.name}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm max-w-2xl leading-relaxed">
              ศูนย์ควบคุมการกำกับดูแลทรัพยากรทางการศึกษา คลังข้อสอบกลาง การประเมินผลสัมฤทธิ์
              และการบริหารจัดการบัญชีผู้ใช้งานระดับสถาบัน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition"
            >
              <Users className="w-4 h-4" />
              จัดการผู้ใช้งาน
            </Link>
            <Link
              href="/admin/courses"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/20 transition"
            >
              <BookOpen className="w-4 h-4" />
              ทะเบียนรายวิชา
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Six Institutional KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Users Card */}
        <Link
          href="/admin/users"
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md transition flex flex-col justify-between group"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 transition">
                ผู้ใช้งานทั้งหมดในระบบ
              </p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 font-mono">
                {totalUsers}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition border border-indigo-100">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>นักศึกษา: <strong className="text-emerald-700 font-mono">{studentCount}</strong></span>
            <span>อาจารย์: <strong className="text-blue-700 font-mono">{teacherCount}</strong></span>
            <span>แอดมิน: <strong className="text-purple-700 font-mono">{adminCount}</strong></span>
          </div>
        </Link>

        {/* Courses Card */}
        <Link
          href="/admin/courses"
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow-md transition flex flex-col justify-between group"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-blue-600 transition">
                รายวิชาที่เปิดสอนทั้งหมด
              </p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 font-mono">
                {totalCourses}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition border border-blue-100">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>รายวิชาที่จัดการในระบบ</span>
            <span className="text-blue-600 font-bold inline-flex items-center gap-1 group-hover:translate-x-1 transition">
              ดูทะเบียนวิชา <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>

        {/* Question Sets Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                ชุดข้อสอบในคลัง (Item Banks)
              </p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 font-mono">
                {totalQuestionSets}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Layers className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>คลังข้อสอบตามรายวิชา</span>
            <span className="font-semibold text-purple-700 font-mono">{totalQuestions} ข้อในระบบ</span>
          </div>
        </div>

        {/* Total Questions Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                ข้อสอบรายข้อทั้งหมด
              </p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 font-mono">
                {totalQuestions}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <HelpCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>พร้อมสุ่มสร้างและจัดทำแบบทดสอบ</span>
            <span className="font-semibold text-amber-700 font-mono">มาตรฐานกลาง</span>
          </div>
        </div>

        {/* Active Exams Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                แบบทดสอบที่สร้าง (Exams)
              </p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 font-mono">
                {totalExams}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <FileCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>การสอบวัดและประเมินผล</span>
            <span className="font-semibold text-emerald-700 font-mono">{totalAttempts} ครั้งที่สอบ</span>
          </div>
        </div>

        {/* Exam Attempts Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                ประวัติการส่งข้อสอบ (Attempts)
              </p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 font-mono">
                {totalAttempts}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
              <Award className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>บันทึกผลคะแนนอัตโนมัติ</span>
            <span className="font-semibold text-teal-700">Auto-Graded</span>
          </div>
        </div>
      </div>

      {/* 4. Governance & Infrastructure Security Panel */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Lock className="w-4 h-4" /> การกำกับดูแลและความปลอดภัยระบบ (Governance & Integrity)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="text-xs text-slate-400 font-medium">ระบบฐานข้อมูลหลัก (Prisma ORM)</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                SQLite Operational
              </div>
              <p className="text-[11px] text-slate-400">รักษาความปลอดภัยและความคงอยู่ของข้อมูล</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="text-xs text-slate-400 font-medium">ระบบสอบและตัวจับเวลาเซิร์ฟเวอร์</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Synchronized Timer Active
              </div>
              <p className="text-[11px] text-slate-400">Autosave & Auto-Submit เที่ยงตรง</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="text-xs text-slate-400 font-medium">ระบบตรวจจับความซื่อสัตย์ในการสอบ</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Audit Logging Enabled
              </div>
              <p className="text-[11px] text-slate-400">บันทึกการสลับหน้าต่างและแท็บ</p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Recent Registered Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">ผู้ใช้งานที่ลงทะเบียนล่าสุดในระบบ</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ดึงข้อมูลผู้ใช้งานจริงจากฐานข้อมูล แสดง 8 รายการล่าสุด
            </p>
          </div>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition self-start sm:self-auto border border-indigo-100"
          >
            จัดการผู้ใช้งานทั้งหมด ({totalUsers})
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                <th className="px-6 py-4">อีเมล</th>
                <th className="px-6 py-4">รหัสประจำตัว</th>
                <th className="px-6 py-4">บทบาท (Role)</th>
                <th className="px-6 py-4">สถานะบัญชี</th>
                <th className="px-6 py-4 text-right">วันที่สมัคร</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentUsers.map((u) => {
                const initials = u.name ? u.name.trim().charAt(0) : "U";
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {initials}
                        </div>
                        <span className="font-semibold text-slate-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">{u.email}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      {u.studentOrTeacherId || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.role === "ADMIN"
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : u.role === "TEACHER"
                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                            : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          u.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.isActive ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {u.isActive ? "ใช้งานได้ปกติ" : "ระงับการใช้งาน"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 text-right">
                      {new Date(u.createdAt).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

