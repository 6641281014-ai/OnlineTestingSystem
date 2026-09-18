"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  ArrowLeft,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";

interface Student {
  id: string;
  name: string;
  email: string;
  studentOrTeacherId?: string | null;
}

interface Enrollment {
  id: string;
  studentId: string;
  enrolledAt: string;
  student: Student;
}

export default function CourseStudentsPage({
  params,
}: {
  params: { id: string };
}) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/courses/${params.id}/enrollments`);
      const data = await res.json();
      if (data.success) {
        setEnrollments(data.enrollments);
        setAvailableStudents(data.availableStudents);
      }
    } catch {
      setFeedback({ type: "error", message: "ไม่สามารถโหลดข้อมูลนักศึกษาได้" });
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const handleOpenAddModal = () => {
    setSelectedStudentId(availableStudents.length > 0 ? availableStudents[0].id : "");
    setModalError(null);
    setIsAddModalOpen(true);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setModalError("กรุณาเลือกนักศึกษา");
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      const res = await fetch(`/api/courses/${params.id}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudentId }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setModalError(data.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
        setSubmitting(false);
        return;
      }

      setIsAddModalOpen(false);
      setFeedback({ type: "success", message: data.message });
      fetchEnrollments();
    } catch {
      setModalError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`คุณต้องการถอน ${studentName} ออกจากรายวิชานี้หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/courses/${params.id}/enrollments?studentId=${studentId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setFeedback({ type: "error", message: data.message || "ไม่สามารถถอนนักศึกษาได้" });
        return;
      }

      setFeedback({ type: "success", message: `ถอน ${studentName} เรียบร้อยแล้ว` });
      fetchEnrollments();
    } catch {
      setFeedback({ type: "error", message: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์" });
    }
  };

  const filteredEnrollments = enrollments.filter(
    (e) =>
      e.student.name.toLowerCase().includes(search.toLowerCase()) ||
      e.student.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.student.studentOrTeacherId &&
        e.student.studentOrTeacherId.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link href="/instructor/dashboard" className="hover:text-indigo-600 transition">
          แดชบอร์ด
        </Link>
        <span>/</span>
        <Link href="/instructor/courses" className="hover:text-indigo-600 transition">
          รายวิชาที่รับผิดชอบ
        </Link>
        <span>/</span>
        <Link href={`/instructor/courses/${params.id}`} className="hover:text-indigo-600 transition">
          ภาพรวมรายวิชา
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">นักศึกษาในรายวิชา</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                ทะเบียนนักศึกษาในรายวิชา
              </h1>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm">
              จัดการรายชื่อ ตรวจสอบการลงทะเบียน และติดตามสถานะผู้เรียนในชั้นเรียน
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition"
            >
              <UserPlus className="w-4 h-4" /> เพิ่มนักศึกษาเข้ารายวิชา
            </button>
          </div>
        </div>

        {/* Roster Stats Bar */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
              นักศึกษาที่ลงทะเบียนแล้ว
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">{enrollments.length}</span>
              <span className="text-xs text-slate-500 font-medium">คน</span>
            </div>
          </div>
          <div className="border-l border-slate-100 pl-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
              นักศึกษาในระบบที่ยังไม่ได้ลงทะเบียน
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-indigo-600">{availableStudents.length}</span>
              <span className="text-xs text-slate-500 font-medium">คน พร้อมลงทะเบียน</span>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <Alert type={feedback.type} message={feedback.message} className="mb-4" />
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, อีเมล, หรือรหัสนักศึกษา..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold px-2 shrink-0">
          แสดง {filteredEnrollments.length} จาก {enrollments.length} คน
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">กำลังโหลดรายชื่อนักศึกษา...</p>
          </div>
        ) : filteredEnrollments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">ไม่พบนักศึกษา</h3>
            <p className="text-xs text-slate-500 mt-1">
              {search ? "ไม่พบนักศึกษาที่ตรงกับการค้นหา" : "ยังไม่มีนักศึกษาลงทะเบียนในรายวิชานี้"}
            </p>
            {!search && (
              <button
                onClick={handleOpenAddModal}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 font-semibold text-xs hover:bg-indigo-100 transition"
              >
                <UserPlus className="w-4 h-4" /> เพิ่มนักศึกษาคนแรก
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">#</th>
                  <th className="px-6 py-3.5">รหัสนักศึกษา</th>
                  <th className="px-6 py-3.5">ชื่อ-นามสกุล</th>
                  <th className="px-6 py-3.5">อีเมล</th>
                  <th className="px-6 py-3.5">วันที่ลงทะเบียน</th>
                  <th className="px-6 py-3.5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEnrollments.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 text-xs text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600 text-xs">
                      {item.student.studentOrTeacherId || "-"}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {item.student.name.charAt(0)}
                        </div>
                        <span>{item.student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{item.student.email}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(item.enrolledAt).toLocaleDateString("th-TH")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemoveStudent(item.studentId, item.student.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="ถอนออกจากวิชา"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="เพิ่มนักศึกษาเข้ารายวิชา"
      >
        {modalError && <Alert type="error" message={modalError} className="mb-4" />}
        <form onSubmit={handleAddStudent} className="space-y-4">
          {availableStudents.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm bg-slate-50 rounded-xl">
              นักศึกษาทุกคนในระบบได้ลงทะเบียนในรายวิชานี้เรียบร้อยแล้ว
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                เลือกนักศึกษาที่ต้องการลงทะเบียน *
              </label>
              <select
                required
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {availableStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.studentOrTeacherId ? `[${s.studentOrTeacherId}] ` : ""}
                    {s.name} ({s.email})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                มีนักศึกษาที่ยังไม่ได้ลงทะเบียนในวิชานี้ {availableStudents.length} คน
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting || availableStudents.length === 0}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              บันทึกการลงทะเบียน
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
