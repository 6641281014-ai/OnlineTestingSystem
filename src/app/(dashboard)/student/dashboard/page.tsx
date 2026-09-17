import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { BookOpen, Clock, Award, CheckCircle2, ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const currentUser = await requireRole(["STUDENT", "ADMIN"]);

  // Fetch student enrollments and available exams
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: currentUser.id },
    include: {
      course: {
        include: {
          instructor: {
            select: { name: true },
          },
          exams: {
            where: { isPublished: true },
            include: {
              _count: {
                select: { examQuestions: true },
              },
            },
          },
        },
      },
    },
  });

  // Fetch past attempts
  const attempts = await prisma.examAttempt.findMany({
    where: {
      studentId: currentUser.id,
      status: { not: "CANCELLED" },
    },
    include: {
      exam: {
        include: {
          course: true,
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  const allAvailableExams = enrollments.flatMap((e) =>
    e.course.exams.map((exam) => ({
      ...exam,
      courseCode: e.course.code,
      courseTitle: e.course.title,
    }))
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm mb-1">
          <Award className="w-4 h-4" /> แผงควบคุมนักศึกษา
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          สวัสดี, {currentUser.name}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          รหัสนักศึกษา: <span className="font-mono font-medium text-slate-700">{currentUser.studentOrTeacherId || "-"}</span> | ติดตามแบบทดสอบและผลสัมฤทธิ์ทางการเรียน
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">รายวิชาที่ลงทะเบียน</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{enrollments.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">แบบทดสอบที่เปิดสอบ</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{allAvailableExams.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">แบบทดสอบที่ทำแล้ว</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{attempts.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Available Exams Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">แบบทดสอบที่เปิดให้ทำ</h2>
          <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">
            พร้อมเข้าสอบ
          </span>
        </div>

        {allAvailableExams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            ขณะนี้ยังไม่มีแบบทดสอบที่เปิดสอบในรายวิชาของคุณ
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {allAvailableExams.map((exam) => {
              const examAttempts = attempts.filter((a) => a.examId === exam.id);
              const submittedAttempt = examAttempts.find(
                (a) => a.status === "SUBMITTED" || a.status === "TIMED_OUT"
              );
              const inProgressAttempt = examAttempts.find((a) => a.status === "IN_PROGRESS");
              const examAttempt = submittedAttempt || inProgressAttempt;
              const isSubmitted = Boolean(submittedAttempt);
              const isInProgress = !isSubmitted && Boolean(inProgressAttempt);

              return (
                <div
                  key={exam.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-emerald-300 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                        {exam.courseCode}
                      </span>
                      {isSubmitted ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ทำเสร็จแล้ว ({submittedAttempt?.totalScore ?? 0}/{exam.totalScore})
                        </span>
                      ) : isInProgress ? (
                        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <Clock className="w-3 h-3 text-amber-600" /> กำลังทำค้างอยู่
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {exam.examType}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">{exam.title}</h3>
                    <p className="text-xs text-slate-500 mb-4">{exam.courseTitle}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl mb-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>เวลา: {exam.durationMinutes} นาที</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>จำนวน: {exam._count.examQuestions} ข้อ</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={
                      isSubmitted
                        ? `/student/exams/${exam.id}/result`
                        : isInProgress
                        ? `/student/exams/${exam.id}/take`
                        : `/student/exams/${exam.id}`
                    }
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-center text-xs flex items-center justify-center gap-1.5 transition ${
                      isInProgress
                        ? "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
                        : isSubmitted
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/20"
                    }`}
                  >
                    {isSubmitted ? (
                      <>
                        <Award className="w-3.5 h-3.5" /> ดูผลการสอบ
                      </>
                    ) : isInProgress ? (
                      <>
                        <Clock className="w-3.5 h-3.5" /> ทำข้อสอบต่อ (Resume)
                      </>
                    ) : (
                      <>
                        เริ่มทำแบบทดสอบ <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Attempts / Score History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">ประวัติและผลการสอบล่าสุด</h2>
          <p className="text-xs text-slate-500 mt-0.5">ผลสัมฤทธิ์และคะแนนที่บันทึกไว้ในระบบ</p>
        </div>

        {attempts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            ยังไม่มีประวัติการทำแบบทดสอบ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">แบบทดสอบ</th>
                  <th className="px-6 py-3.5">รายวิชา</th>
                  <th className="px-6 py-3.5">วันที่ส่ง</th>
                  <th className="px-6 py-3.5">คะแนนที่ได้</th>
                  <th className="px-6 py-3.5">ร้อยละ (%)</th>
                  <th className="px-6 py-3.5">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-medium text-slate-900">{att.exam.title}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-indigo-600">
                      {att.exam.course.code}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {att.submittedAt
                        ? new Date(att.submittedAt).toLocaleString("th-TH")
                        : "กำลังทำ"}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {att.totalScore} / {att.exam.totalScore}
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-600">
                      {att.percentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          att.status === "SUBMITTED"
                            ? "bg-emerald-100 text-emerald-700"
                            : att.status === "IN_PROGRESS"
                            ? "bg-amber-100 text-amber-700"
                            : att.status === "TIMED_OUT"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {att.status === "SUBMITTED"
                          ? "ส่งแล้ว"
                          : att.status === "IN_PROGRESS"
                          ? "กำลังทำ"
                          : att.status === "TIMED_OUT"
                          ? "หมดเวลา"
                          : att.status}
                      </span>
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
