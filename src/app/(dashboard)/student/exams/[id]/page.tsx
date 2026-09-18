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
  ChevronRight,
  GraduationCap,
  Sparkles,
  CheckCircle,
  Wifi,
  User,
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
          academicYear: true,
          semester: true,
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Academic Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link
          href="/student/dashboard"
          className="hover:text-emerald-600 transition flex items-center gap-1"
        >
          <GraduationCap className="w-3.5 h-3.5" /> แดชบอร์ด
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <Link href="/student/exams" className="hover:text-emerald-600 transition">
          แบบทดสอบออนไลน์
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-700 font-semibold truncate max-w-xs sm:max-w-sm">
          {exam.course.code} - {exam.title}
        </span>
      </nav>

      {/* 2. Main Lobby Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Course & Exam Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative">
          <div className="absolute right-0 top-0 w-80 h-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-400/30">
                {exam.course.code}
              </span>
              <span className="text-xs text-slate-300 bg-white/10 px-3 py-1 rounded-xl">
                {exam.course.title}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-emerald-400/20 text-emerald-300">
                {exam.examType}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {exam.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>อาจารย์ผู้สอน: <strong>{exam.course.instructor.name}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>ปีการศึกษา {exam.course.academicYear || "2569"} / ภาคเรียนที่ {exam.course.semester || "1"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Attempt Result Banner (If Submitted) */}
          {isSubmitted && (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-base text-emerald-900">
                  <Award className="w-5 h-5 text-emerald-600" /> ผลการทำแบบทดสอบ (ส่งเรียบร้อยแล้ว)
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-200 text-emerald-900">
                  {attempt.status === "TIMED_OUT" ? "หมดเวลาทำข้อสอบ" : "ส่งข้อสอบแล้ว"}
                </span>
              </div>
              <div className="text-xs text-emerald-800">
                ส่งเมื่อ: {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString("th-TH") : "-"}
              </div>
              <div className="pt-3 flex flex-col sm:flex-row items-baseline justify-between gap-3 border-t border-emerald-200/60">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-emerald-700 font-mono">
                    {attempt.totalScore}
                  </span>
                  <span className="text-sm text-emerald-900 font-medium">
                    / {exam.totalScore} คะแนน ({attempt.percentage.toFixed(1)}%)
                  </span>
                </div>
                <Link
                  href={`/student/exams/${exam.id}/result`}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-1.5"
                >
                  ดูรายงานผลคะแนนฉบับเต็มและเฉลย <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
            <div className="p-3 bg-white rounded-xl border border-slate-200/60">
              <span className="text-[11px] text-slate-400 font-medium">จำนวนข้อสอบ</span>
              <p className="text-xl font-bold text-slate-900 font-mono mt-0.5">{exam._count.examQuestions} ข้อ</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/60">
              <span className="text-[11px] text-slate-400 font-medium">คะแนนเต็ม</span>
              <p className="text-xl font-bold text-emerald-600 font-mono mt-0.5">{exam.totalScore} คะแนน</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/60">
              <span className="text-[11px] text-slate-400 font-medium">เวลาทำข้อสอบ</span>
              <p className="text-xl font-bold text-slate-900 font-mono mt-0.5">{exam.durationMinutes} นาที</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/60">
              <span className="text-[11px] text-slate-400 font-medium">ประเภทข้อสอบ</span>
              <p className="text-sm font-bold text-slate-800 mt-1.5 truncate">{exam.examType}</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" /> คำชี้แจงและแนวปฏิบัติในการสอบ
            </h3>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {exam.description || "ให้นักศึกษาทำแบบทดสอบด้วยตนเองตามกำหนดเวลาที่กำหนด มีสมาธิและรอบคอบในการเลือกคำตอบ"}
            </div>
          </div>

          {/* Academic Integrity & Technical Advisory */}
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-2.5">
            <div className="font-bold flex items-center gap-2 text-amber-900 text-sm">
              <ShieldAlert className="w-4 h-4 text-amber-600" /> ข้อตกลงความซื่อสัตย์ทางวิชาการและคำแนะนำทางเทคนิค
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-amber-900/90 pl-1 leading-relaxed">
              <li>
                <strong>ตัวจับเวลามาตรฐาน (Synchronized Timer):</strong> เวลาสอบคำนวณและนับถอยหลังโดยเซิร์ฟเวอร์ และระบบจะทำการส่งข้อสอบอัตโนมัติเมื่อหมดเวลา
              </li>
              <li>
                <strong>การบันทึกคำตอบอัตโนมัติ (Autosave):</strong> ทุกครั้งที่ท่านคลิกเลือกคำตอบ ระบบจะบันทึกลงฐานข้อมูลทันทีโดยไม่ต้องกดบันทึกเอง
              </li>
              <li>
                <strong>ระบบตรวจจับการทุจริต:</strong> การสลับแท็บ ย่อหน้าต่าง หรือเปิดโปรแกรมอื่นจะถูกบันทึกในรายงานความประพฤติการสอบ (Audit Log)
              </li>
              <li>
                <strong>การเชื่อมต่อ:</strong> แนะนำให้ตรวจสอบสัญญาณอินเทอร์เน็ตให้เสถียรก่อนกดเริ่มทำแบบทดสอบ
              </li>
            </ul>
          </div>

          {/* Action CTA Section */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              {notStartedYet && (
                <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> ยังไม่ถึงกำหนดเวลาสอบ (เริ่ม: {new Date(exam.startTime!).toLocaleString("th-TH")})
                </span>
              )}
              {isExpired && (
                <span className="text-rose-600 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> แบบทดสอบนี้สิ้นสุดระยะเวลาการทำแล้ว
                </span>
              )}
              {isSubmitted && (
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> คุณได้ส่งแบบทดสอบนี้เรียบร้อยแล้ว
                </span>
              )}
              {isInProgress && (
                <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" /> คุณมีข้อสอบที่กำลังทำค้างอยู่ สามารถกดทำต่อได้ทันที
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link
                href="/student/exams"
                className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs text-center transition"
              >
                ย้อนกลับ
              </Link>

              {isSubmitted ? (
                <Link
                  href={`/student/exams/${exam.id}/result`}
                  className="flex-1 sm:flex-initial px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4" /> ดูผลการสอบและเฉลย
                </Link>
              ) : isInProgress ? (
                <Link
                  href={`/student/exams/${exam.id}/take`}
                  className="flex-1 sm:flex-initial px-8 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition flex items-center justify-center gap-2"
                >
                  ทำข้อสอบต่อ (Resume) <ArrowRight className="w-4 h-4" />
                </Link>
              ) : canStartExam ? (
                <Link
                  href={`/student/exams/${exam.id}/take`}
                  className="flex-1 sm:flex-initial px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                >
                  เริ่มทำแบบทดสอบ <ArrowRight className="w-4 h-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

