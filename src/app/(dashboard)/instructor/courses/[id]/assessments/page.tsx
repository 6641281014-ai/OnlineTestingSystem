"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  FileSpreadsheet,
  Plus,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Edit2,
  Loader2,
  Upload,
  ArrowRight,
  FolderTree,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import FileImportModal from "@/components/assessments/FileImportModal";
import CreateExamFromSetModal from "@/components/assessments/CreateExamFromSetModal";

interface QuestionSet {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  questionCount: number;
  categoryCount: number;
}

interface Exam {
  id: string;
  title: string;
  description?: string | null;
  examType: string;
  durationMinutes: number;
  totalScore: number;
  passingScore: number;
  isPublished: boolean;
  _count: {
    examQuestions: number;
    attempts: number;
  };
}

export default function CourseAssessmentsPage({
  params,
}: {
  params: { id: string };
}) {
  const [course, setCourse] = useState<{ id: string; code: string; title: string } | null>(null);
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Question Set Modals
  const [isCreateSetModalOpen, setIsCreateSetModalOpen] = useState(false);
  const [isEditSetModalOpen, setIsEditSetModalOpen] = useState(false);
  const [isDeleteSetModalOpen, setIsDeleteSetModalOpen] = useState(false);
  const [selectedSet, setSelectedSet] = useState<QuestionSet | null>(null);
  const [setTitle, setSetTitle] = useState("");
  const [setDescription, setSetDescription] = useState("");
  const [submittingSet, setSubmittingSet] = useState(false);
  const [setError, setSetError] = useState<string | null>(null);

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTargetSetId, setImportTargetSetId] = useState<string | null>(null);

  // Exam Generation Modal
  const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState(false);
  const [examTargetSet, setExamTargetSet] = useState<QuestionSet | null>(null);
  const [courseCategories, setCourseCategories] = useState<{ id: string; name: string }[]>([]);

  // Delete Exam Modal
  const [isDeleteExamModalOpen, setIsDeleteExamModalOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isDeletingExam, setIsDeletingExam] = useState(false);
  const [deleteExamError, setDeleteExamError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [setsRes, examsRes, catsRes] = await Promise.all([
        fetch(`/api/courses/${params.id}/question-sets`),
        fetch(`/api/courses/${params.id}/exams`),
        fetch(`/api/courses/${params.id}/categories`),
      ]);

      const setsData = await setsRes.json();
      const examsData = await examsRes.json();
      const catsData = await catsRes.json();

      if (setsData.success) {
        setCourse(setsData.course);
        setQuestionSets(setsData.questionSets);
      }
      if (examsData.success) {
        setExams(examsData.exams);
      }
      if (catsData.success) {
        setCourseCategories(catsData.categories);
      }
    } catch {
      setFeedback({ type: "error", message: "ไม่สามารถโหลดข้อมูลชุดข้อสอบและแบบทดสอบได้" });
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Question Set Actions
  const handleOpenCreateSet = () => {
    setSetTitle("");
    setSetDescription("");
    setSetError(null);
    setIsCreateSetModalOpen(true);
  };

  const handleOpenEditSet = (qs: QuestionSet) => {
    setSelectedSet(qs);
    setSetTitle(qs.title);
    setSetDescription(qs.description || "");
    setSetError(null);
    setIsEditSetModalOpen(true);
  };

  const handleOpenDeleteSet = (qs: QuestionSet) => {
    setSelectedSet(qs);
    setSetError(null);
    setIsDeleteSetModalOpen(true);
  };

  const handleOpenImport = (setId: string) => {
    setImportTargetSetId(setId);
    setIsImportModalOpen(true);
  };

  const handleCreateSet = async (e: React.FormEvent, openImportImmediately: boolean = false) => {
    e.preventDefault();
    if (!setTitle.trim()) {
      setSetError("กรุณาระบุชื่อชุดข้อสอบ");
      return;
    }
    setSubmittingSet(true);
    setSetError(null);

    try {
      const res = await fetch(`/api/courses/${params.id}/question-sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: setTitle.trim(), description: setDescription.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSetError(data.message || "เกิดข้อผิดพลาดในการสร้างชุดข้อสอบ");
        setSubmittingSet(false);
        return;
      }

      setIsCreateSetModalOpen(false);
      fetchData();

      if (openImportImmediately && data.questionSet?.id) {
        setImportTargetSetId(data.questionSet.id);
        setIsImportModalOpen(true);
        setFeedback({
          type: "success",
          message: `สร้างชุดข้อสอบ "${data.questionSet.title}" สำเร็จ! กรุณาเลือกไฟล์เพื่อนำเข้าข้อสอบ`,
        });
      } else {
        setFeedback({ type: "success", message: "สร้างชุดข้อสอบใหม่เรียบร้อยแล้ว" });
      }
    } catch {
      setSetError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmittingSet(false);
    }
  };

  const handleEditSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSet || !setTitle.trim()) return;

    setSubmittingSet(true);
    setSetError(null);

    try {
      const res = await fetch(`/api/courses/${params.id}/question-sets/${selectedSet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: setTitle.trim(), description: setDescription.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSetError(data.message || "เกิดข้อผิดพลาดในการแก้ไขชุดข้อสอบ");
        setSubmittingSet(false);
        return;
      }

      setIsEditSetModalOpen(false);
      setFeedback({ type: "success", message: "แก้ไขชุดข้อสอบสำเร็จ" });
      fetchData();
    } catch {
      setSetError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmittingSet(false);
    }
  };

  const handleDeleteSet = async () => {
    if (!selectedSet) return;
    setSubmittingSet(true);

    try {
      const res = await fetch(`/api/courses/${params.id}/question-sets/${selectedSet.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSetError(data.message || "ไม่สามารถลบชุดข้อสอบได้");
        setSubmittingSet(false);
        return;
      }

      setIsDeleteSetModalOpen(false);
      setFeedback({ type: "success", message: "ลบชุดข้อสอบเรียบร้อยแล้ว" });
      fetchData();
    } catch {
      setSetError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmittingSet(false);
    }
  };

  // Toggle Exam Publish
  const handleTogglePublish = async (examId: string) => {
    try {
      const res = await fetch(`/api/exams/${examId}/publish`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
        fetchData();
      } else {
        setFeedback({ type: "error", message: data.message || "ไม่สามารถเปลี่ยนสถานะได้" });
      }
    } catch {
      setFeedback({ type: "error", message: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์" });
    }
  };

  // Delete Exam Handlers
  const handleOpenDeleteExam = (exam: Exam) => {
    setExamToDelete(exam);
    setDeleteExamError(null);
    setIsDeleteExamModalOpen(true);
  };

  const handleConfirmDeleteExam = async () => {
    if (!examToDelete) return;
    try {
      setIsDeletingExam(true);
      setDeleteExamError(null);
      const res = await fetch(`/api/exams/${examToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDeleteExamError(data.message || "ไม่สามารถลบแบบทดสอบได้");
        setIsDeletingExam(false);
        return;
      }
      setIsDeleteExamModalOpen(false);
      setExamToDelete(null);
      setFeedback({ type: "success", message: `ลบแบบทดสอบ "${examToDelete.title}" เรียบร้อยแล้ว` });
      fetchData();
    } catch {
      setDeleteExamError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsDeletingExam(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href={`/instructor/courses/${params.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium mb-3 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังภาพรวมรายวิชา ({course?.code})
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              ชุดข้อสอบและแบบทดสอบ (Question Sets & Exams)
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              ศูนย์รวมการจัดการชุดข้อสอบ คลังคำถาม การนำเข้าไฟล์ และการสร้างแบบทดสอบประเมินผล
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.message}
        />
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">กำลังโหลดข้อมูลชุดข้อสอบและแบบทดสอบ...</p>
        </div>
      ) : (
        <>
          {/* ============================================================== */}
          {/* SECTION A: ชุดข้อสอบ (Question Sets)                            */}
          {/* ============================================================== */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" /> ชุดข้อสอบ
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  จัดกลุ่มข้อสอบเป็นชุด นำเข้าจากไฟล์ (DOCX/XLSX/CSV/TXT) และใช้สำหรับสุ่มสร้างแบบทดสอบ
                </p>
              </div>
              <button
                onClick={handleOpenCreateSet}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition"
              >
                <Plus className="w-4 h-4" /> สร้างชุดข้อสอบใหม่
              </button>
            </div>

            {questionSets.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">ยังไม่มีชุดข้อสอบในรายวิชานี้</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  เริ่มต้นสร้างชุดข้อสอบแรก เพื่อจัดระเบียบคำถาม และนำเข้าข้อสอบจากไฟล์ Word หรือ Excel
                </p>
                <button
                  onClick={handleOpenCreateSet}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-xs hover:bg-indigo-100 transition"
                >
                  <Plus className="w-4 h-4" /> สร้างชุดข้อสอบแรก
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {questionSets.map((qs) => (
                  <div
                    key={qs.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                          {qs.title}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditSet(qs)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="แก้ไขชื่อชุด"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteSet(qs)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="ลบชุดข้อสอบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 mb-4 h-8">
                        {qs.description || "ไม่มีคำอธิบายชุดข้อสอบ"}
                      </p>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-center text-xs mb-4">
                        <div>
                          <span className="block font-bold text-slate-800 text-sm">
                            {qs.questionCount}
                          </span>
                          <span className="text-[10px] text-slate-500">จำนวนข้อ</span>
                        </div>
                        <div className="border-l border-slate-200">
                          <span className="block font-bold text-slate-800 text-sm">
                            {qs.categoryCount}
                          </span>
                          <span className="text-[10px] text-slate-500">หมวดหมู่</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <Link
                        href={`/instructor/courses/${params.id}/question-sets/${qs.id}`}
                        className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        เปิดดูข้อสอบ <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ============================================================== */}
          {/* SECTION B: แบบทดสอบ (Exams)                                     */}
          {/* ============================================================== */}
          <section className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> แบบทดสอบ
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  แบบทดสอบที่สร้างไว้สำหรับให้นักศึกษาเข้าสอบ ควบคุมเวลา สุ่มข้อสอบ และประเมินผล
                </p>
              </div>
            </div>

            {exams.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">ยังไม่มีแบบทดสอบในรายวิชานี้</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  สามารถสร้างแบบทดสอบได้โดยกดเลือกชุดข้อสอบด้านบน แล้วกด "สร้างแบบทดสอบจากชุดนี้" เพื่อสุ่มข้อสอบอัตโนมัติ
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3.5">ชื่อแบบทดสอบ</th>
                        <th className="px-5 py-3.5">ประเภท</th>
                        <th className="px-5 py-3.5 text-center">จำนวนข้อ</th>
                        <th className="px-5 py-3.5 text-center">เวลา (นาที)</th>
                        <th className="px-5 py-3.5 text-center">คะแนนเต็ม</th>
                        <th className="px-5 py-3.5 text-center">ผู้เข้าสอบ</th>
                        <th className="px-5 py-3.5 text-center">สถานะ</th>
                        <th className="px-5 py-3.5 text-right">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {exams.map((exam) => (
                        <tr key={exam.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-5 py-4">
                            <Link
                              href={`/instructor/courses/${params.id}/exams/${exam.id}`}
                              className="font-bold text-slate-900 hover:text-indigo-600 transition block"
                            >
                              {exam.title}
                            </Link>
                            {exam.description && (
                              <span className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                {exam.description}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {exam.examType}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center font-bold text-xs">
                            {exam._count.examQuestions} ข้อ
                          </td>
                          <td className="px-5 py-4 text-center text-xs">
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              <Clock className="w-3.5 h-3.5 text-slate-400" /> {exam.durationMinutes}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center font-bold text-xs font-mono text-indigo-700">
                            {exam.totalScore}
                          </td>
                          <td className="px-5 py-4 text-center text-xs font-medium">
                            {exam._count.attempts} คน
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => handleTogglePublish(exam.id)}
                              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition ${
                                exam.isPublished
                                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                              title="คลิกเพื่อสลับสถานะ เปิด/ปิดสอบ"
                            >
                              {exam.isPublished ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> เปิดสอบแล้ว
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-slate-400" /> ฉบับร่าง
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/instructor/courses/${params.id}/exams/${exam.id}/results`}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                                title="ดูผลการสอบ"
                              >
                                ดูผลสอบ ({exam._count.attempts})
                              </Link>
                              <Link
                                href={`/instructor/courses/${params.id}/exams/${exam.id}`}
                                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
                                title="จัดการข้อสอบในชุดนี้"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                onClick={() => handleOpenDeleteExam(exam)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="ลบแบบทดสอบ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* Create Set Modal */}
      <Modal
        isOpen={isCreateSetModalOpen}
        onClose={() => setIsCreateSetModalOpen(false)}
        title="สร้างชุดข้อสอบใหม่"
      >
        {setError && <Alert type="error" message={setError} className="mb-4" />}
        <form onSubmit={handleCreateSet} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อชุดข้อสอบ *
            </label>
            <input
              type="text"
              required
              value={setTitle}
              onChange={(e) => setSetTitle(e.target.value)}
              placeholder="เช่น กลางภาค Web Programming หรือ คลังข้อสอบบทที่ 1-3"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              คำอธิบายชุดข้อสอบ
            </label>
            <textarea
              rows={3}
              value={setDescription}
              onChange={(e) => setSetDescription(e.target.value)}
              placeholder="รายละเอียดเนื้อหา หรือจุดประสงค์ของชุดข้อสอบนี้..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateSetModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submittingSet}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-70"
            >
              {submittingSet && <Loader2 className="w-4 h-4 animate-spin" />}
              บันทึก
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Set Modal */}
      <Modal
        isOpen={isEditSetModalOpen}
        onClose={() => setIsEditSetModalOpen(false)}
        title="แก้ไขชุดข้อสอบ"
      >
        {setError && <Alert type="error" message={setError} className="mb-4" />}
        <form onSubmit={handleEditSet} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อชุดข้อสอบ *
            </label>
            <input
              type="text"
              required
              value={setTitle}
              onChange={(e) => setSetTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              คำอธิบายชุดข้อสอบ
            </label>
            <textarea
              rows={3}
              value={setDescription}
              onChange={(e) => setSetDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditSetModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submittingSet}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-70"
            >
              {submittingSet && <Loader2 className="w-4 h-4 animate-spin" />}
              บันทึกการแก้ไข
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Set Modal */}
      <Modal
        isOpen={isDeleteSetModalOpen}
        onClose={() => setIsDeleteSetModalOpen(false)}
        title="ยืนยันการลบชุดข้อสอบ"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            คุณต้องการลบชุดข้อสอบ <span className="font-bold text-slate-900">"{selectedSet?.title}"</span> หรือไม่?
            ข้อสอบภายในชุดจะไม่ถูกลบออกจากฐานข้อมูล แต่จะถูกปลดออกจากชุดข้อสอบนี้
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteSetModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleDeleteSet}
              disabled={submittingSet}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition flex items-center gap-1.5 disabled:opacity-70"
            >
              {submittingSet && <Loader2 className="w-4 h-4 animate-spin" />}
              ยืนยันการลบ
            </button>
          </div>
        </div>
      </Modal>

      {/* File Import Modal */}
      {importTargetSetId && (
        <FileImportModal
          isOpen={isImportModalOpen}
          onClose={() => {
            setIsImportModalOpen(false);
            setImportTargetSetId(null);
          }}
          courseId={params.id}
          questionSetId={importTargetSetId}
          onImportSuccess={(count) => {
            setFeedback({ type: "success", message: `นำเข้าข้อสอบสำเร็จจำนวน ${count} ข้อ` });
            fetchData();
          }}
        />
      )}

      {/* Delete Exam Modal */}
      <Modal
        isOpen={isDeleteExamModalOpen}
        onClose={() => {
          if (!isDeletingExam) {
            setIsDeleteExamModalOpen(false);
            setExamToDelete(null);
          }
        }}
        title="ยืนยันการลบแบบทดสอบ"
      >
        <div className="space-y-4">
          {deleteExamError && <Alert type="error" message={deleteExamError} />}
          <p className="text-sm text-slate-600">
            คุณแน่ใจหรือไม่ว่าต้องการลบแบบทดสอบ{" "}
            <span className="font-bold text-slate-900">&quot;{examToDelete?.title}&quot;</span>?
          </p>
          {examToDelete && examToDelete._count.attempts > 0 && (
            <Alert
              type="warning"
              message={`แบบทดสอบนี้มีนักศึกษาเข้าทำแล้ว ${examToDelete._count.attempts} ครั้ง จึงไม่สามารถลบได้ เพื่อรักษาข้อมูลคะแนน`}
            />
          )}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsDeleteExamModalOpen(false);
                setExamToDelete(null);
              }}
              disabled={isDeletingExam}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteExam}
              disabled={isDeletingExam || (examToDelete?._count.attempts ?? 0) > 0}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isDeletingExam && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              ยืนยันการลบ
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Exam From Set Modal */}
      {examTargetSet && (
        <CreateExamFromSetModal
          isOpen={isCreateExamModalOpen}
          onClose={() => {
            setIsCreateExamModalOpen(false);
            setExamTargetSet(null);
          }}
          courseId={params.id}
          questionSetId={examTargetSet.id}
          questionSetTitle={examTargetSet.title}
          totalQuestionsInSet={examTargetSet.questionCount}
          categories={courseCategories}
          onSuccess={() => {
            fetchData();
            setFeedback({
              type: "success",
              message: `สร้างแบบทดสอบจากชุด "${examTargetSet.title}" สำเร็จเรียบร้อยแล้ว`,
            });
          }}
        />
      )}
    </div>
  );
}
