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
  GraduationCap,
  Sparkles,
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
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link href="/instructor/dashboard" className="hover:text-indigo-600 transition">
          แดชบอร์ด
        </Link>
        <span>/</span>
        <Link href="/instructor/courses" className="hover:text-indigo-600 transition">
          รายวิชาที่รับผิดชอบ
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold truncate max-w-md">
          {course.code} - {course.title}
        </span>
      </nav>

      {/* Course Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-mono border border-indigo-100">
                {course.code}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600">
                ปีการศึกษา {course.academicYear || "2569"} / ภาคเรียนที่ {course.semester || "1"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {course.title}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm max-w-3xl leading-relaxed">
              {course.description || "ไม่มีคำอธิบายรายวิชา"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href={`/instructor/courses/${course.id}/reports`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/80 font-bold text-xs transition shadow-sm"
              title="ดูรายงานผลการวิจัยในชั้นเรียน และการคำนวณ t-test / E1-E2"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <span>ข้อมูลงานวิจัยในชั้นเรียน</span>
            </Link>
            <Link
              href={`/instructor/courses/${course.id}/analytics`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition"
              title="วิเคราะห์ผลสัมฤทธิ์และพัฒนาการผู้เรียน"
            >
              <TrendingUp className="w-4 h-4" />
              <span>วิเคราะห์ผลสัมฤทธิ์</span>
            </Link>
          </div>
        </div>

        {/* Academic Course Vital Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="text-center sm:text-left">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
              นักศึกษาในชั้นเรียน
            </span>
            <div className="flex items-baseline gap-1.5 justify-center sm:justify-start">
              <span className="text-2xl font-black text-slate-900">{course._count.enrollments}</span>
              <span className="text-xs text-slate-500 font-medium">คน</span>
            </div>
          </div>

          <div className="text-center sm:text-left border-x border-slate-100 px-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
              ชุดข้อสอบในคลัง
            </span>
            <div className="flex items-baseline gap-1.5 justify-center sm:justify-start">
              <span className="text-2xl font-black text-indigo-600">{course._count.questionSets}</span>
              <span className="text-xs text-slate-500 font-medium">ชุดข้อสอบ</span>
            </div>
          </div>

          <div className="text-center sm:text-left">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
              แบบทดสอบที่สร้าง
            </span>
            <div className="flex items-baseline gap-1.5 justify-center sm:justify-start">
              <span className="text-2xl font-black text-emerald-600">{course._count.exams}</span>
              <span className="text-xs text-slate-500 font-medium">แบบทดสอบ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2 Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* 1. นักศึกษาในรายวิชา */}
        <Link
          href={`/instructor/courses/${course.id}/students`}
          className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:border-purple-400 hover:shadow-lg transition-all group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 group-hover:text-purple-600 transition-colors">
                  นักศึกษาในรายวิชา
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  จัดการทะเบียนรายชื่อ ตรวจสอบการลงทะเบียน และติดตามสถานะผู้เรียนในชั้นเรียน
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600">
            <span>เข้าสู่บัญชีรายชื่อนักศึกษา ({course._count.enrollments} คน)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 group-hover:bg-purple-600 text-purple-600 group-hover:text-white flex items-center justify-center transition-colors">
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </Link>

        {/* 2. ชุดข้อสอบและแบบทดสอบ */}
        <Link
          href={`/instructor/courses/${course.id}/assessments`}
          className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-400 hover:shadow-lg transition-all group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <Layers className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                  ชุดข้อสอบและแบบทดสอบ
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  ศูนย์รวมคลังคำถาม นำเข้าข้อสอบ สุ่มสร้างแบบทดสอบ และควบคุมการเปิดสอบ
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
            <span>เข้าสู่ศูนย์ข้อสอบและแบบทดสอบ ({course._count.exams} ชุดสอบ)</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
