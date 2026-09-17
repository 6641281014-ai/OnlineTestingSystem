import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  FileSpreadsheet,
  Clock,
  Layers,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Award,
  Calendar,
  ShieldAlert,
  ArrowRight,
  BookOpen,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentExamLobbyPage({
  params,
}: {
  params: { id: string };
}) {
  const currentUser = await requireRole(["STUDENT", "ADMIN"]);

  const exam = await prisma.exam.findUnique({
    where: { id: params.id },
    include: {
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          instructor: { select: { name: true, email: true } },
        },
      },
      _count: {
        select: { examQuestions: true },
      },
    },
  });

  if (!exam) {
    notFound();
  }

  // Check enrollment
  if (currentUser.role === "STUDENT") {
    const isEnrolled = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_studentId: { courseId: exam.courseId, studentId: currentUser.id },
      },
    });

    if (!isEnrolled || !exam.isPublished) {
      notFound();
    }
  }

  // Fetch student attempt history
  const attempt = await prisma.examAttempt.findFirst({
    where: { examId: params.id, studentId: currentUser.id },
    orderBy: { attemptNumber: "desc" },
  });

  const now = new Date();
  const notStartedYet = exam.startTime ? now < new Date(exam.startTime) : false;
  const isExpired = exam.endTime ? now > new Date(exam.endTime) : false;
  const isSubmitted = attempt && (attempt.status === "SUBMITTED" || attempt.status === "TIMED_OUT");
  const isInProgress = attempt && attempt.status === "IN_PROGRESS";

  const canStartExam = !isSubmitted && !notStartedYet && !isExpired && exam._count.examQuestions > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/student/exams"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 font-medium mb-3 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังรายการแบบทดสอบทั้งหมด
        </Link>
      </div>

      {/* Main Lobby Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-mono">
              {exam.course.code}
            </span>
            <span className="text-xs text-slate-500 font-medium">{exam.course.title}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{exam.title}</h1>
          <p className="text-xs text-slate-400 mt-1">
            อาจารย์ผู้สอน: {exam.course.instructor.name}
          </p>
        </div>

        {/* Attempt Result Banner (If Submitted) */}
        {isSubmitted && (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-base text-emerald-900">
                <Award className="w-5 h-5 text-emerald-600" /> ผลการทำแบบทดสอบ (ส่งเรียบร้อยแล้ว)
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900">
                {attempt.status === "TIMED_OUT" ? "หมดเวลาทำข้อสอบ" : "ส่งข้อสอบแล้ว"}
              </span>
            </div>
            <div className="text-xs text-emerald-800">
              ส่งเมื่อ: {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString("th-TH") : "-"}
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-baseline justify-between gap-3 border-t border-emerald-200/60">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-700 font-mono">
                  {attempt.totalScore}
                </span>
                <span className="text-sm text-emerald-900 font-medium">
                  / {exam.totalScore} คะแนน ({attempt.percentage.toFixed(1)}%)
                </span>
              </div>
              <Link
                href={`/student/exams/${exam.id}/result`}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-1.5"
              >
                ดูรายงานผลสอบฉบับเต็ม <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Quick Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl text-center">
          <div>
            <span className="text-[11px] text-slate-400 font-medium">จำนวนข้อสอบ</span>
            <p className="text-lg font-bold text-slate-800">{exam._count.examQuestions} ข้อ</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">คะแนนเต็ม</span>
            <p className="text-lg font-bold text-emerald-600">{exam.totalScore} คะแนน</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">เวลาทำข้อสอบ</span>
            <p className="text-lg font-bold text-slate-800">{exam.durationMinutes} นาที</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">ประเภท</span>
            <p className="text-lg font-bold text-slate-800">{exam.examType}</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900">คำชี้แจงในการสอบ</h3>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
            {exam.description || "ให้นักศึกษาทำแบบทดสอบด้วยความซื่อสัตย์สุจริต และบริหารเวลาให้เหมาะสมตามที่กำหนด"}
          </div>
        </div>

        {/* Anti-Cheat Advisory */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-amber-950">
            <ShieldAlert className="w-4 h-4 text-amber-600" /> ข้อตกลงและระบบป้องกันการทุจริต
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800 pl-1">
            <li>ระบบมีตัวจับเวลา Synchronized กับเซิร์ฟเวอร์ และจะส่งข้อสอบอัตโนมัติเมื่อหมดเวลา</li>
            <li>ระบบจะบันทึกคำตอบอัตโนมัติ (Autosave) ทุกครั้งที่มีการเลือกคำตอบ</li>
            <li>การสลับแท็บหรือเปลี่ยนหน้าต่างเบราว์เซอร์จะถูกบันทึกในระบบประวัติการสอบ</li>
          </ul>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {notStartedYet && (
              <span className="text-amber-600 font-semibold">
                ยังไม่ถึงเวลาเริ่มสอบ (เริ่ม {new Date(exam.startTime!).toLocaleString("th-TH")})
              </span>
            )}
            {isExpired && (
              <span className="text-rose-600 font-semibold">แบบทดสอบนี้ปิดรับการส่งแล้ว</span>
            )}
            {isSubmitted && (
              <span className="text-emerald-600 font-semibold">
                คุณได้ส่งแบบทดสอบนี้เรียบร้อยแล้ว และข้อสอบถูกล็อกแล้ว
              </span>
            )}
            {isInProgress && (
              <span className="text-amber-600 font-semibold">
                คุณมีแบบทดสอบที่กำลังทำค้างอยู่ สามารถกดทำข้อสอบต่อได้
              </span>
            )}
          </div>

          {isSubmitted ? (
            <Link
              href={`/student/exams/${exam.id}/result`}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2"
            >
              <Award className="w-4 h-4" /> ดูผลการสอบ (View Result)
            </Link>
          ) : isInProgress ? (
            <Link
              href={`/student/exams/${exam.id}/take`}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-600/20 transition flex items-center justify-center gap-2"
            >
              ทำข้อสอบต่อ (Resume) <ArrowRight className="w-4 h-4" />
            </Link>
          ) : canStartExam ? (
            <Link
              href={`/student/exams/${exam.id}/take`}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2"
            >
              เริ่มทำข้อสอบ <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/student/exams"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs text-center transition"
            >
              กลับหน้ารวมแบบทดสอบ
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
