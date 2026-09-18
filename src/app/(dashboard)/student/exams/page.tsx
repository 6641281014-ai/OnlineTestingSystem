import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  FileSpreadsheet,
  Clock,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronRight,
  GraduationCap,
  Sparkles,
  BookOpen,
  Calendar,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentExamsPage() {
  const currentUser = await requireRole(["STUDENT", "ADMIN"]);

  // Get enrolled course IDs
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: currentUser.id },
    select: { courseId: true },
  });
  const courseIds = enrollments.map((e) => e.courseId);

  // Get published exams
  const exams = await prisma.exam.findMany({
    where: {
      courseId: { in: courseIds },
      isPublished: true,
    },
    include: {
      course: { select: { id: true, code: true, title: true } },
      _count: { select: { examQuestions: true } },
      attempts: {
        where: { studentId: currentUser.id },
        orderBy: { attemptNumber: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate quick metrics
  const submittedExams = exams.filter(
    (e) =>
      e.attempts[0] &&
      (e.attempts[0].status === "SUBMITTED" || e.attempts[0].status === "TIMED_OUT")
  );
  const inProgressExams = exams.filter(
    (e) => e.attempts[0] && e.attempts[0].status === "IN_PROGRESS"
  );
  const unattemptedExams = exams.filter((e) => !e.attempts[0]);

  return (
    <div className="space-y-6">
      {/* 1. Academic Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link
          href="/student/dashboard"
          className="hover:text-emerald-600 transition flex items-center gap-1"
        >
          <GraduationCap className="w-3.5 h-3.5" /> แดชบอร์ด
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-700 font-semibold">แบบทดสอบออนไลน์ของฉัน</span>
      </nav>

      {/* 2. Hero Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-50 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100/80 text-emerald-800 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>ศูนย์รวมแบบทดสอบและการประเมินผลออนไลน์ (Online Examination)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              แบบทดสอบออนไลน์ของฉัน
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm max-w-2xl leading-relaxed">
              รายการแบบทดสอบและข้อสอบประเมินผลสัมฤทธิ์ทางการเรียน ในทุกรายวิชาที่ท่านได้ลงทะเบียนเรียน
            </p>
          </div>

          {/* Quick Metrics Pills */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-center min-w-[100px]">
              <div className="text-[11px] text-slate-400 font-medium">เปิดสอบทั้งหมด</div>
              <div className="text-xl font-extrabold text-slate-900">{exams.length}</div>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-center min-w-[100px]">
              <div className="text-[11px] text-emerald-700 font-medium">ส่งผลสอบแล้ว</div>
              <div className="text-xl font-extrabold text-emerald-800">{submittedExams.length}</div>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-100 text-center min-w-[100px]">
              <div className="text-[11px] text-amber-700 font-medium">ยังไม่ได้ทำ / ค้าง</div>
              <div className="text-xl font-extrabold text-amber-800">
                {unattemptedExams.length + inProgressExams.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Exams Grid */}
      {exams.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">ไม่มีแบบทดสอบที่เปิดสอบในขณะนี้</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            เมื่ออาจารย์ผู้สอนประจำรายวิชาเปิดแบบทดสอบหรือการวัดผล แบบทดสอบจะปรากฏที่หน้านี้โดยอัตโนมัติ
          </p>
          <div className="pt-2">
            <Link
              href="/student/courses"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
            >
              <BookOpen className="w-3.5 h-3.5" /> ไปยังหน้ารายวิชาของฉัน
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => {
            const attempt = exam.attempts[0];
            const isSubmitted =
              attempt &&
              (attempt.status === "SUBMITTED" || attempt.status === "TIMED_OUT");
            const isInProgress = attempt && attempt.status === "IN_PROGRESS";

            return (
              <div
                key={exam.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md hover:border-emerald-300 transition flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Course Code & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-mono border border-emerald-100/80">
                        {exam.course.code}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                        {exam.examType}
                      </span>
                    </div>

                    {isSubmitted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ทำเสร็จแล้ว
                      </span>
                    ) : isInProgress ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> กำลังทำค้างอยู่
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        ยังไม่ได้ทำ
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1 leading-snug line-clamp-1">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-slate-400 mb-4 truncate font-medium">
                    {exam.course.title}
                  </p>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-600 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam.durationMinutes} นาที</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam._count.examQuestions} ข้อ</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-between pt-1.5 border-t border-slate-200/60">
                      <span className="text-slate-400">คะแนนเต็ม:</span>
                      <span className="font-bold text-slate-900">{exam.totalScore} คะแนน</span>
                    </div>
                  </div>

                  {isSubmitted && (
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 mb-4 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                        <Award className="w-4 h-4 text-emerald-600" /> ผลคะแนนที่ได้:
                      </div>
                      <div className="font-bold text-emerald-950 text-sm font-mono">
                        {attempt.totalScore} / {exam.totalScore} ({attempt.percentage.toFixed(1)}%)
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <Link
                    href={
                      isSubmitted
                        ? `/student/exams/${exam.id}/result`
                        : isInProgress
                        ? `/student/exams/${exam.id}/take`
                        : `/student/exams/${exam.id}`
                    }
                    className={`w-full py-3 px-4 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition ${
                      isInProgress
                        ? "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
                        : isSubmitted
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/20"
                    }`}
                  >
                    {isInProgress ? (
                      <>
                        <Clock className="w-3.5 h-3.5" /> ทำข้อสอบต่อ (Resume)
                      </>
                    ) : isSubmitted ? (
                      <>
                        <Award className="w-3.5 h-3.5" /> ดูผลการสอบและเฉลย
                      </>
                    ) : (
                      <>
                        เข้าสู่ห้องสอบ <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

