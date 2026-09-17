import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { BookOpen, Users, FileSpreadsheet, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InstructorDashboardPage() {
  const currentUser = await requireRole(["TEACHER", "ADMIN"]);

  const courseFilter =
    currentUser.role === "ADMIN" ? {} : { instructorId: currentUser.id };

  const [coursesCount, enrollments, examsCount] = await Promise.all([
    prisma.course.count({ where: courseFilter }),
    prisma.courseEnrollment.findMany({
      where: { course: courseFilter },
      select: { studentId: true },
      distinct: ["studentId"],
    }),
    prisma.exam.count({ where: { course: courseFilter } }),
  ]);

  const totalStudents = enrollments.length;

  const rawName = currentUser.name.trim();
  const teacherDisplayName = rawName.startsWith("อาจารย์")
    ? rawName
    : `อาจารย์ ${rawName}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          ยินดีต้อนรับ{teacherDisplayName.startsWith("อาจารย์") ? teacherDisplayName : `อาจารย์ ${teacherDisplayName}`}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          ภาพรวมข้อมูลการสอนและสถิติในระบบทดสอบออนไลน์
        </p>
      </div>

      {/* 3 Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. จำนวนรายวิชาที่ต้องรับผิดชอบ */}
        <Link
          href="/instructor/courses"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors">
              1. จำนวนรายวิชาที่ต้องรับผิดชอบ
            </span>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {coursesCount}
              </span>
              <span className="text-sm font-medium text-slate-500">วิชา</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
            <span>ดูรายวิชาทั้งหมด</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 2. จำนวนนักศึกษาทั้งหมด */}
        <Link
          href="/instructor/courses"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-purple-400 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-600 group-hover:text-purple-600 transition-colors">
              2. จำนวนนักศึกษาทั้งหมด
            </span>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {totalStudents}
              </span>
              <span className="text-sm font-medium text-slate-500">คน</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
            <span>ดูรายชื่อนักศึกษาในรายวิชา</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 3. จำนวนชุดแบบทดสอบ */}
        <Link
          href="/instructor/courses"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-600 group-hover:text-emerald-600 transition-colors">
              3. จำนวนชุดแบบทดสอบ
            </span>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {examsCount}
              </span>
              <span className="text-sm font-medium text-slate-500">ชุดแบบทดสอบ</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
            <span>จัดการชุดแบบทดสอบ</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}
