import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Calendar,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  User,
  Award,
  ChevronRight,
  GraduationCap,
  FileSpreadsheet,
  BarChart3,
  CheckCircle,
  Layers,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentCourseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const currentUser = await requireRole(["STUDENT", "ADMIN"]);

  // Check enrollment
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: {
      courseId_studentId: {
        courseId: params.id,
        studentId: currentUser.id,
      },
    },
    include: {
      course: {
        include: {
          instructor: {
            select: { name: true, email: true },
          },
          exams: {
            where: { isPublished: true },
            include: {
              _count: { select: { examQuestions: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!enrollment && currentUser.role !== "ADMIN") {
    notFound();
  }

  const course = enrollment
    ? enrollment.course
    : await prisma.course.findUnique({
        where: { id: params.id },
        include: {
          instructor: { select: { name: true, email: true } },
          exams: {
            where: { isPublished: true },
            include: { _count: { select: { examQuestions: true } } },
          },
        },
      });

  if (!course) {
    notFound();
  }

  // Fetch student's attempts in this course
  const studentAttempts = await prisma.examAttempt.findMany({
    where: {
      studentId: currentUser.id,
      exam: { courseId: params.id },
    },
    include: {
      exam: true,
    },
    orderBy: { startedAt: "desc" },
  });

  // Calculate learning metrics
  const totalExams = course.exams.length;
  const submittedAttempts = studentAttempts.filter(
    (a) => a.status === "SUBMITTED" || a.status === "TIMED_OUT"
  );
  const completedCount = submittedAttempts.length;
  const avgPercentage =
    submittedAttempts.length > 0
      ? (
          submittedAttempts.reduce((acc, a) => acc + a.percentage, 0) /
          submittedAttempts.length
        ).toFixed(1)
      : null;

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
        <Link href="/student/courses" className="hover:text-emerald-600 transition">
          รายวิชาและการลงทะเบียน
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-700 font-semibold truncate max-w-xs sm:max-w-md">
          {course.code} - {course.title}
        </span>
      </nav>

      {/* 2. Course Hero Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-50 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-mono border border-emerald-100/80">
              {course.code}
            </span>
            <span className="text-xs font-medium px-3 py-1 rounded-xl bg-slate-100 text-slate-600">
              ปีการศึกษา {course.academicYear || "2569"} / ภาคเรียนที่ {course.semester || "1"}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              <CheckCircle className="w-3 h-3 text-emerald-600" /> ลงทะเบียนเรียนแล้ว
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {course.title}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-3xl leading-relaxed">
              {course.description || "คำอธิบายรายวิชาและวัตถุประสงค์การเรียนรู้ตามหลักสูตร"}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">แบบทดสอบที่เปิดสอบ</p>
                <p className="text-base font-bold text-slate-900">{totalExams} แบบทดสอบ</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">ทำเสร็จสิ้นแล้ว</p>
                <p className="text-base font-bold text-slate-900">{completedCount} ครั้ง</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">คะแนนเฉลี่ยสะสม</p>
                <p className="text-base font-bold text-slate-900">
                  {avgPercentage !== null ? `${avgPercentage}%` : "ยังไม่มีข้อมูล"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Instructor Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 flex-shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 mb-0.5">
              <Sparkles className="w-3 h-3" /> อาจารย์ผู้รับผิดชอบรายวิชา
            </div>
            <h3 className="text-sm font-bold text-slate-900">{course.instructor.name}</h3>
            <p className="text-xs text-slate-500">{course.instructor.email}</p>
          </div>
        </div>

        <Link
          href="/student/courses"
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700 font-medium px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังรายวิชาทั้งหมด
        </Link>
      </div>

      {/* 4. Available Exams in Course */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-5 bg-emerald-600 rounded-full" />
            <h2 className="text-lg font-bold text-slate-900">แบบทดสอบในรายวิชานี้</h2>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-100">
            {course.exams.length} แบบทดสอบ
          </span>
        </div>

        {course.exams.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">ยังไม่มีแบบทดสอบที่เปิดสอบในขณะนี้</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              เมื่ออาจารย์ผู้สอนเปิดแบบทดสอบหรือการประเมินผล รายการข้อสอบจะปรากฏที่หน้านี้โดยอัตโนมัติ
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {course.exams.map((exam) => {
              const examAttempt = studentAttempts.find((a) => a.examId === exam.id);
              const isSubmitted =
                examAttempt &&
                (examAttempt.status === "SUBMITTED" || examAttempt.status === "TIMED_OUT");
              const isInProgress = examAttempt && examAttempt.status === "IN_PROGRESS";

              return (
                <div
                  key={exam.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:border-emerald-300 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                        {exam.examType}
                      </span>
                      {isSubmitted ? (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ทำเสร็จแล้ว ({examAttempt.totalScore}/{exam.totalScore})
                        </span>
                      ) : isInProgress ? (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-3 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> กำลังทำค้างอยู่
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600">
                          คะแนนเต็ม {exam.totalScore}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">{exam.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {exam.description || "แบบทดสอบวัดผลการเรียนรู้ตามวัตถุประสงค์ของรายวิชา"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>เวลา: <strong className="text-slate-800">{exam.durationMinutes}</strong> นาที</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>จำนวน: <strong className="text-slate-800">{exam._count.examQuestions}</strong> ข้อ</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-2">
                    <Link
                      href={
                        isSubmitted
                          ? `/student/exams/${exam.id}/result`
                          : isInProgress
                          ? `/student/exams/${exam.id}/take`
                          : `/student/exams/${exam.id}`
                      }
                      className={`w-full py-3 px-4 rounded-2xl font-bold text-center text-xs flex items-center justify-center gap-1.5 transition ${
                        isInProgress
                          ? "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
                          : isSubmitted
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                          : "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/20"
                      }`}
                    >
                      {isSubmitted ? (
                        <>
                          <Award className="w-3.5 h-3.5" /> ดูผลการสอบและเฉลย
                        </>
                      ) : isInProgress ? (
                        <>
                          <Clock className="w-3.5 h-3.5" /> ทำข้อสอบต่อ (Resume)
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

      {/* 5. Past Attempts in this Course */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">ประวัติผลการสอบในวิชานี้</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              บันทึกคะแนนและประวัติการส่งแบบทดสอบทั้งหมดของผู้เรียน
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {studentAttempts.length} รายการ
          </span>
        </div>

        {studentAttempts.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            ยังไม่มีประวัติการทำแบบทดสอบในวิชานี้
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-4">แบบทดสอบ</th>
                  <th className="px-6 py-4">วันที่ส่ง</th>
                  <th className="px-6 py-4">คะแนนที่ได้</th>
                  <th className="px-6 py-4">ร้อยละ (%)</th>
                  <th className="px-6 py-4">สถานะ</th>
                  <th className="px-6 py-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentAttempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">{att.exam.title}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {att.submittedAt
                        ? new Date(att.submittedAt).toLocaleString("th-TH")
                        : "กำลังทำ"}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 font-mono">
                      {att.totalScore} / {att.exam.totalScore}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600 font-mono">
                      {att.percentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          att.status === "SUBMITTED"
                            ? "bg-emerald-100 text-emerald-800"
                            : att.status === "TIMED_OUT"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {att.status === "SUBMITTED"
                          ? "ส่งแล้ว"
                          : att.status === "TIMED_OUT"
                          ? "หมดเวลา"
                          : "กำลังทำ"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/student/exams/${att.examId}/result`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition border border-emerald-100"
                      >
                        ดูรายงานผล <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

