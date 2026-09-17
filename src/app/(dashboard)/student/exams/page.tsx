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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm mb-1">
          <Clock className="w-4 h-4" /> แบบทดสอบที่เปิดสอบ
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          แบบทดสอบออนไลน์ของฉัน
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          รายการแบบทดสอบในรายวิชาที่คุณลงทะเบียนเรียน
        </p>
      </div>

      {exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">ไม่มีแบบทดสอบที่เปิดสอบในขณะนี้</h3>
          <p className="text-xs text-slate-500 mt-1">
            เมื่ออาจารย์ผู้สอนเปิดให้ทำแบบทดสอบ แบบทดสอบจะปรากฏที่หน้านี้
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => {
            const attempt = exam.attempts[0];
            const isSubmitted = attempt && (attempt.status === "SUBMITTED" || attempt.status === "TIMED_OUT");
            const isInProgress = attempt && attempt.status === "IN_PROGRESS";

            return (
              <div
                key={exam.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-emerald-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-mono">
                      {exam.course.code}
                    </span>
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

                  <h3 className="text-base font-bold text-slate-900 mb-1">{exam.title}</h3>
                  <p className="text-xs text-slate-400 mb-4 truncate">{exam.course.title}</p>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs text-slate-600 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam.durationMinutes} นาที</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam._count.examQuestions} ข้อ</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400">คะแนนเต็ม:</span>
                      <span className="font-bold text-slate-800">{exam.totalScore} คะแนน</span>
                    </div>
                  </div>

                  {isSubmitted && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 mb-4 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                        <Award className="w-4 h-4 text-emerald-600" /> ผลคะแนนที่ได้:
                      </div>
                      <div className="font-bold text-emerald-900 text-sm">
                        {attempt.totalScore} / {exam.totalScore} ({attempt.percentage.toFixed(1)}%)
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={
                      isSubmitted
                        ? `/student/exams/${exam.id}/result`
                        : isInProgress
                        ? `/student/exams/${exam.id}/take`
                        : `/student/exams/${exam.id}`
                    }
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition ${
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
                        <Award className="w-3.5 h-3.5" /> ดูผลการสอบ
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
