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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/student/courses"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 font-medium mb-3 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังรายวิชาทั้งหมด
        </Link>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-mono">
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

      {/* Instructor Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <User className="w-6 h-6" />
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium">อาจารย์ผู้สอน</span>
          <h3 className="text-sm font-bold text-slate-900">{course.instructor.name}</h3>
          <p className="text-xs text-slate-500">{course.instructor.email}</p>
        </div>
      </div>

      {/* Available Exams in Course */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">แบบทดสอบในรายวิชานี้</h2>
          <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">
            {course.exams.length} แบบทดสอบ
          </span>
        </div>

        {course.exams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            ขณะนี้ยังไม่มีแบบทดสอบที่เปิดสอบในรายวิชานี้
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
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-emerald-300 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {exam.examType}
                      </span>
                      {isSubmitted ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ทำเสร็จแล้ว ({examAttempt.totalScore}/{exam.totalScore})
                        </span>
                      ) : isInProgress ? (
                        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <Clock className="w-3 h-3 text-amber-600" /> กำลังทำค้างอยู่
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600">
                          คะแนนเต็ม {exam.totalScore}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">{exam.title}</h3>
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                      {exam.description || "ไม่มีคำชี้แจง"}
                    </p>

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

      {/* Past Attempts in this Course */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">ประวัติผลการสอบในวิชานี้</h2>
        </div>

        {studentAttempts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            ยังไม่มีประวัติการทำแบบทดสอบในวิชานี้
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">แบบทดสอบ</th>
                  <th className="px-6 py-3.5">วันที่ส่ง</th>
                  <th className="px-6 py-3.5">คะแนนที่ได้</th>
                  <th className="px-6 py-3.5">ร้อยละ (%)</th>
                  <th className="px-6 py-3.5">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentAttempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-medium text-slate-900">{att.exam.title}</td>
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
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {att.status}
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
