import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BookOpen, Users, HelpCircle, FileSpreadsheet, Shield, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  await requireRole(["ADMIN"]);

  const courses = await prisma.course.findMany({
    include: {
      instructor: {
        select: { id: true, name: true, email: true, studentOrTeacherId: true },
      },
      _count: {
        select: { enrollments: true, questions: true, exams: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm mb-1">
          <Shield className="w-4 h-4" /> แผงควบคุมผู้ดูแลระบบ
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          รายวิชาทั้งหมดในระบบ (All Courses)
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          ภาพรวมรายวิชาที่อาจารย์ผู้สอนทุกคนสร้างขึ้นในระบบ
        </p>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">รายการวิชาทั้งหมด ({courses.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">รหัสวิชา</th>
                <th className="px-6 py-3.5">ชื่อรายวิชา</th>
                <th className="px-6 py-3.5">อาจารย์ผู้สอน</th>
                <th className="px-6 py-3.5">ปี/เทอม</th>
                <th className="px-6 py-3.5 text-center">นักศึกษา</th>
                <th className="px-6 py-3.5 text-center">ข้อสอบ</th>
                <th className="px-6 py-3.5 text-center">ชุดสอบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4 font-mono font-bold text-indigo-600 text-xs">
                    {c.code}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{c.title}</td>
                  <td className="px-6 py-4 text-xs">
                    <div className="font-semibold text-slate-800">{c.instructor.name}</div>
                    <div className="text-slate-400">{c.instructor.email}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {c.academicYear || "2569"} / {c.semester || "1"}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-xs">{c._count.enrollments}</td>
                  <td className="px-6 py-4 text-center font-bold text-xs">{c._count.questions}</td>
                  <td className="px-6 py-4 text-center font-bold text-xs">{c._count.exams}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
