import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import {
  BookOpen,
  Users,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Layers,
  TrendingUp,
  GraduationCap,
  FolderKanban,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InstructorDashboardPage() {
  const currentUser = await requireRole(["TEACHER", "ADMIN"]);

  const courseFilter =
    currentUser.role === "ADMIN" ? {} : { instructorId: currentUser.id };

  const [coursesCount, enrollments, examsCount, recentCourses] = await Promise.all([
    prisma.course.count({ where: courseFilter }),
    prisma.courseEnrollment.findMany({
      where: { course: courseFilter },
      select: { studentId: true },
      distinct: ["studentId"],
    }),
    prisma.exam.count({ where: { course: courseFilter } }),
    prisma.course.findMany({
      where: courseFilter,
      include: {
        _count: {
          select: { enrollments: true, exams: true, questionSets: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
  ]);

  const totalStudents = enrollments.length;

  const rawName = currentUser.name.trim();
  const teacherDisplayName = rawName.startsWith("อาจารย์")
    ? rawName
    : `อาจารย์ ${rawName}`;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>พื้นที่การทำงานทางวิชาการ (Academic Teaching Workspace)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              ยินดีต้อนรับ{teacherDisplayName.startsWith("อาจารย์") ? teacherDisplayName : `อาจารย์ ${teacherDisplayName}`}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              ศูนย์รวมการบริหารจัดการรายวิชา คลังข้อสอบ การประเมินผลการเรียนรู้ และรายงานวิจัยเพื่อพัฒนาผู้เรียน
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/instructor/courses"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
            >
              <BookOpen className="w-4 h-4" />
              <span>ไปยังรายวิชาของฉัน</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Main Stats Cards (Strictly 1, 2, 3 per user requirement) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. จำนวนรายวิชาที่ต้องรับผิดชอบ */}
        <Link
          href="/instructor/courses"
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-400 hover:shadow-lg transition-all group flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">1</span>
                จำนวนรายวิชาที่ต้องรับผิดชอบ
              </span>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                  {coursesCount}
                </span>
                <span className="text-sm font-semibold text-slate-500">รายวิชา</span>
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
            <span>เข้าจัดการรายวิชา</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </Link>

        {/* 2. จำนวนนักศึกษาทั้งหมด */}
        <Link
          href="/instructor/courses"
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:border-purple-400 hover:shadow-lg transition-all group flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-slate-700 group-hover:text-purple-600 transition-colors flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-black">2</span>
                จำนวนนักศึกษาทั้งหมด
              </span>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                  {totalStudents}
                </span>
                <span className="text-sm font-semibold text-slate-500">คน (ลงทะเบียน)</span>
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600">
            <span>ดูรายชื่อนักศึกษาในรายวิชา</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </Link>

        {/* 3. จำนวนชุดแบบทดสอบ */}
        <Link
          href="/instructor/courses"
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:border-emerald-400 hover:shadow-lg transition-all group flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-slate-700 group-hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">3</span>
                จำนวนชุดแบบทดสอบ
              </span>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                  {examsCount}
                </span>
                <span className="text-sm font-semibold text-slate-500">ชุดแบบทดสอบ</span>
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600">
            <span>จัดการชุดแบบทดสอบ</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Assessment Lifecycle & Pedagogical Guide */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              วงจรการวัดและประเมินผลทางการศึกษา (Assessment Lifecycle)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              แนวทางและขั้นตอนการจัดการทดสอบเพื่อการประเมินผลสัมฤทธิ์ทางการเรียนอย่างมีประสิทธิภาพ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">1. คลังชุดข้อสอบ (Item Bank)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              จัดกลุ่มข้อสอบเป็นชุด นำเข้าจากไฟล์ Word / Excel หรือสร้างทีละข้อ พร้อมกำหนดตัวชี้วัดและระดับความยากง่าย
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">2. สร้างแบบทดสอบ (Exams)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              สุ่มข้อสอบตามเกณฑ์ กำหนดเวลาสอบ เกณฑ์การผ่าน และสั่งเปิดให้นักศึกษาเริ่มทำแบบทดสอบได้ทันที
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">3. วิเคราะห์สถิติ & วิจัย (Analytics)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              ประเมินคุณภาพข้อสอบ ค่าความยาก (p) ค่าอำนาจจำแนก (r) และวิเคราะห์สถิติ t-test / E1/E2 สำหรับงานวิจัยในชั้นเรียน
            </p>
          </div>
        </div>
      </div>

      {/* Quick Access to Recent Courses */}
      {recentCourses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-indigo-600" />
              รายวิชาที่เข้าถึงล่าสุด
            </h2>
            <Link
              href="/instructor/courses"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition flex items-center gap-1"
            >
              ดูรายวิชาทั้งหมด ({coursesCount}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recentCourses.map((course) => (
              <Link
                key={course.id}
                href={`/instructor/courses/${course.id}`}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-mono">
                      {course.code}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ปี {course.academicYear || "2569"} / เทอม {course.semester || "1"}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-1 mb-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-3">
                    {course.description || "ไม่มีคำอธิบายรายวิชา"}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" /> {course._count.enrollments} คน
                    </span>
                    <span className="flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" /> {course._count.exams} ชุดสอบ
                    </span>
                  </div>
                  <span className="font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    จัดการ <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
