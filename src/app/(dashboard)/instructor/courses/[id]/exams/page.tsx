"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Plus,
  ArrowLeft,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Loader2,
  Eye,
  Shield,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";

interface Exam {
  id: string;
  title: string;
  description?: string | null;
  examType: string;
  durationMinutes: number;
  totalScore: number;
  passingScore: number;
  startTime?: string | null;
  endTime?: string | null;
  isPublished: boolean;
  _count: {
    examQuestions: number;
    attempts: number;
  };
}

export default function CourseExamsPage({
  params,
}: {
  params: { id: string };
}) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/courses/${params.id}/exams`);
      const data = await res.json();
      if (data.success) {
        setExams(data.exams);
      }
    } catch {
      setFeedback({ type: "error", message: "ไม่สามารถโหลดข้อมูลชุดแบบทดสอบได้" });
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleTogglePublish = async (examId: string) => {
    try {
      const res = await fetch(`/api/exams/${examId}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
        fetchExams();
      } else {
        setFeedback({ type: "error", message: data.message || "ไม่สามารถเปลี่ยนสถานะได้" });
      }
    } catch {
      setFeedback({ type: "error", message: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์" });
    }
  };

  const handleOpenDelete = (exam: Exam) => {
    setSelectedExam(exam);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteExam = async () => {
    if (!selectedExam) return;
    setSubmitting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/exams/${selectedExam.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setDeleteError(data.message || "ไม่สามารถลบแบบทดสอบได้");
        setSubmitting(false);
        return;
      }

      setIsDeleteModalOpen(false);
      setFeedback({ type: "success", message: "ลบแบบทดสอบเรียบร้อยแล้ว" });
      fetchExams();
    } catch {
      setDeleteError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/instructor/courses/${params.id}/assessments`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium mb-3 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังชุดข้อสอบและแบบทดสอบ
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              ชุดแบบทดสอบ (Exams)
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              สร้างแบบทดสอบ กำหนดเวลาสอบ สุ่มข้อสอบ และเลือกข้อสอบเข้าชุดสอบ
            </p>
          </div>
          <Link
            href={`/instructor/courses/${params.id}/exams/create`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" /> สร้างชุดแบบทดสอบใหม่
          </Link>
        </div>
      </div>

      {feedback && <Alert type={feedback.type} message={feedback.message} className="mb-4" />}

      {/* Exams Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">กำลังโหลดแบบทดสอบ...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">ยังไม่มีแบบทดสอบ</h3>
          <p className="text-xs text-slate-500 mt-1">
            สร้างชุดแบบทดสอบและเลือกข้อสอบจากคลังเพื่อเปิดให้นักศึกษาเข้าสอบ
          </p>
          <Link
            href={`/instructor/courses/${params.id}/exams/create`}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" /> สร้างแบบทดสอบชุดแรก
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-indigo-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-mono">
                      {exam.examType}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        exam.isPublished
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {exam.isPublished ? "🟢 เปิดสอบแล้ว (Published)" : "🟡 แบบร่าง (Draft)"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/instructor/courses/${params.id}/exams/${exam.id}/edit`}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="แก้ไขการตั้งค่า"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => handleOpenDelete(exam)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="ลบแบบทดสอบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Link
                  href={`/instructor/courses/${params.id}/exams/${exam.id}`}
                  className="group block"
                >
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition mb-1">
                    {exam.title}
                  </h3>
                </Link>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                  {exam.description || "ไม่มีคำชี้แจง"}
                </p>

                {/* Exam Settings Bar */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs text-slate-600 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>เวลา: {exam.durationMinutes} นาที</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>ข้อสอบ: {exam._count.examQuestions} ข้อ</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>คะแนนเต็ม: {exam.totalScore} คะแนน</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>สอบแล้ว: {exam._count.attempts} คน</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/instructor/courses/${params.id}/exams/${exam.id}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold text-center transition flex items-center justify-center gap-1"
                  >
                    จัดการข้อสอบ ({exam._count.examQuestions}) <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    href={`/instructor/courses/${params.id}/exams/${exam.id}/results`}
                    className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold text-center transition flex items-center justify-center gap-1 whitespace-nowrap"
                  >
                    ดูผลสอบ ({exam._count.attempts})
                  </Link>

                  <Link
                    href={`/instructor/courses/${params.id}/exams/${exam.id}/analytics`}
                    className="py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold text-center transition flex items-center justify-center gap-1 whitespace-nowrap"
                  >
                    วิเคราะห์
                  </Link>
                </div>

                <div>
                  {exam.isPublished ? (
                    <button
                      onClick={() => handleTogglePublish(exam.id)}
                      className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition"
                    >
                      🔴 ปิดการสอบ
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTogglePublish(exam.id)}
                      className="w-full py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-1"
                    >
                      🟢 เปิดให้นักเรียนทำแบบทดสอบ
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Exam Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="ยืนยันการลบชุดแบบทดสอบ"
        maxWidth="sm"
      >
        {deleteError && <Alert type="error" message={deleteError} className="mb-4" />}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            คุณต้องการลบแบบทดสอบ <span className="font-bold">{selectedExam?.title}</span> หรือไม่?
            {selectedExam?._count.attempts && selectedExam._count.attempts > 0 ? (
              <span className="block font-bold text-rose-900 mt-1">
                คำเตือน: แบบทดสอบนี้มีประวัติการสอบของนักศึกษาแล้ว ({selectedExam._count.attempts} คน) ระบบจะไม่อนุญาตให้ลบ
              </span>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleDeleteExam}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition flex items-center gap-1.5 disabled:opacity-70"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              ยืนยันการลบ
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
