import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Users,
  FileSpreadsheet,
  ArrowLeft,
  Layers,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const currentUser = await requireRole(["TEACHER", "ADMIN"]);

  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: {
      instructor: { select: { id: true, name: true, email: true } },
      _count: {
        select: { enrollments: true, questions: true, exams: true, categories: true, questionSets: true },
      },
    },
  });

  if (!course) {
    notFound();
  }

  // Anti-IDOR Check
  if (currentUser.role === "TEACHER" && course.instructorId !== currentUser.id) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div>
        <Link
          href="/instructor/courses"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium mb-3 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังรายการวิชาทั้งหมด
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-mono">
                {course.code}
              </span>
              <span className="text-xs text-slate-400">
                ปีการศึกษา {course.academicYear || "2569"} / ภาคเรียนที่ {course.semester || "1"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {course.title}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-3xl">
              {course.description || "ไม่มีคำอธิบายรายวิชา"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/instructor/courses/${course.id}/reports`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-semibold text-xs transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> ข้อมูลงานวิจัย
            </Link>
            <Link
              href={`/instructor/courses/${course.id}/analytics`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition"
            >
              <TrendingUp className="w-3.5 h-3.5" /> วิเคราะห์ผลสัมฤทธิ์
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Link
          href={`/instructor/courses/${course.id}/students`}
          className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
              <Users className="w-7 h-7" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
              นักศึกษาในรายวิชา
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0">
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link
          href={`/instructor/courses/${course.id}/assessments`}
          className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
              <Layers className="w-7 h-7" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
              ชุดข้อสอบและแบบทดสอบ
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0">
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}
