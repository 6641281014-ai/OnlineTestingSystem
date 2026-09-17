import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  FileSpreadsheet,
  Plus,
  Clock,
  Layers,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InstructorAllExamsPage() {
  const currentUser = await requireRole(["TEACHER", "ADMIN"]);

  const exams = await prisma.exam.findMany({
    where:
      currentUser.role === "ADMIN"
        ? {}
        : { course: { instructorId: currentUser.id } },
    include: {
      course: { select: { id: true, code: true, title: true } },
      _count: { select: { examQuestions: true, attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm mb-1">
            <FileSpreadsheet className="w-4 h-4" /> แบบทดสอบทั้งหมด
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            ชุดแบบทดสอบของฉัน (All Exams)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            จัดการและติดตามชุดแบบทดสอบทุกรายวิชาที่คุณสอน
          </p>
        </div>
      </div>

      {exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">ยังไม่มีแบบทดสอบ</h3>
          <p className="text-xs text-slate-500 mt-1">
            กรุณาเข้าสู่หน้ารายวิชาที่ต้องการ เพื่อสร้างชุดแบบทดสอบ
          </p>
          <Link
            href="/instructor/courses"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition"
          >
            ไปที่รายวิชาที่สอน <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-indigo-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-mono">
                    {exam.course.code}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      exam.isPublished
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {exam.isPublished ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> เปิดสอบ
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 text-slate-400" /> แบบร่าง
                      </>
                    )}
                  </span>
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
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">
                  เต็ม {exam.totalScore} คะแนน
                </span>
                <Link
                  href={`/instructor/courses/${exam.course.id}/exams/${exam.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition"
                >
                  จัดการแบบทดสอบ <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
