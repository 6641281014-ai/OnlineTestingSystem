"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Plus,
  Search,
  ArrowLeft,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { DifficultyBadge, QuestionTypeBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";

interface Choice {
  id: string;
  choiceText: string;
  imageUrl?: string | null;
  isCorrect: boolean;
  orderIndex: number;
}

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  difficulty: string;
  defaultScore: number;
  explanation?: string | null;
  category?: { id: string; name: string } | null;
  choices: Choice[];
  _count: { examQuestions: number };
}

interface Category {
  id: string;
  name: string;
}

export default function QuestionBankPage({
  params,
}: {
  params: { id: string };
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("ALL");
  const [difficulty, setDifficulty] = useState("ALL");
  const [questionType, setQuestionType] = useState("ALL");

  // State for delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${params.id}/categories`);
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch {
      console.error("Failed to load categories");
    }
  }, [params.id]);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.set("search", search.trim());
      if (categoryId !== "ALL") queryParams.set("categoryId", categoryId);
      if (difficulty !== "ALL") queryParams.set("difficulty", difficulty);
      if (questionType !== "ALL") queryParams.set("type", questionType);

      const res = await fetch(`/api/courses/${params.id}/questions?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions);
      }
    } catch {
      setFeedback({ type: "error", message: "ไม่สามารถโหลดข้อสอบได้" });
    } finally {
      setLoading(false);
    }
  }, [params.id, search, categoryId, difficulty, questionType]);

  useEffect(() => {
    fetchCategories();
    fetchQuestions();
  }, [fetchCategories, fetchQuestions]);

  const handleOpenDelete = (q: Question) => {
    setSelectedQuestion(q);
    setDeleteError(null);
    setSubmitting(false);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDelete = () => {
    setIsDeleteModalOpen(false);
    setDeleteError(null);
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedQuestion) return;
    setSubmitting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/questions/${selectedQuestion.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setDeleteError(data.message || "ไม่สามารถลบข้อสอบได้");
        return;
      }

      setIsDeleteModalOpen(false);
      setFeedback({ type: "success", message: "ลบข้อสอบเรียบร้อยแล้ว" });
      setQuestions((prev) => prev.filter((item) => item.id !== selectedQuestion.id));
      fetchQuestions();
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
          href={`/instructor/courses/${params.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium mb-3 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังภาพรวมรายวิชา
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              คลังข้อสอบ (Question Bank)
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              สร้าง ค้นหา จัดหมวดหมู่ และจัดการข้อสอบในรายวิชานี้
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/instructor/courses/${params.id}/questions/create`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" /> เพิ่มข้อสอบใหม่
            </Link>
          </div>
        </div>
      </div>

      {feedback && <Alert type={feedback.type} message={feedback.message} className="mb-4" />}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาข้อความในโจทย์คำถาม..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
            {/* Category Filter */}
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">ทุกหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">ทุกระดับความยาก</option>
              <option value="EASY">ระดับง่าย</option>
              <option value="MEDIUM">ระดับปานกลาง</option>
              <option value="HARD">ระดับยาก</option>
            </select>

            {/* Type Filter */}
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">ทุกประเภท</option>
              <option value="MULTIPLE_CHOICE">ปรนัย (Multiple Choice)</option>
              <option value="TRUE_FALSE">ถูก / ผิด (True / False)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>พบข้อสอบทั้งหมด {questions.length} ข้อ</span>
          {(search || categoryId !== "ALL" || difficulty !== "ALL" || questionType !== "ALL") && (
            <button
              onClick={() => {
                setSearch("");
                setCategoryId("ALL");
                setDifficulty("ALL");
                setQuestionType("ALL");
              }}
              className="text-indigo-600 hover:underline font-semibold"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Question Cards List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">กำลังโหลดคลังข้อสอบ...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">ไม่พบข้อสอบ</h3>
          <p className="text-xs text-slate-500 mt-1">
            {search || categoryId !== "ALL"
              ? "ไม่พบข้อสอบที่ตรงกับเงื่อนไขการค้นหา"
              : "ยังไม่มีข้อสอบในคลังของรายวิชานี้"}
          </p>
          <Link
            href={`/instructor/courses/${params.id}/questions/create`}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" /> เพิ่มข้อสอบข้อแรก
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-200 transition"
            >
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <DifficultyBadge difficulty={q.difficulty} />
                  <QuestionTypeBadge type={q.questionType} />
                  {q.category && (
                    <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
                      {q.category.name}
                    </span>
                  )}
                  {q._count.examQuestions > 0 && (
                    <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                      อยู่ในแบบทดสอบ ({q._count.examQuestions} ชุด)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg font-mono">
                    {q.defaultScore} คะแนน
                  </span>
                  <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                    <Link
                      href={`/instructor/courses/${params.id}/questions/${q.id}/edit`}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="แก้ไขข้อสอบ"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleOpenDelete(q)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="ลบข้อสอบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-sm font-semibold text-slate-900 mb-4 whitespace-pre-wrap">
                {q.questionText}
              </div>

              {/* Choices Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3">
                {q.choices.map((c, cIdx) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition ${
                      c.isCorrect
                        ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium"
                        : "bg-slate-50/50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                        c.isCorrect
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {String.fromCharCode(65 + cIdx)}
                    </div>
                    <div className="flex-1 mt-0.5">{c.choiceText}</div>
                    {c.isCorrect && (
                      <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded">
                        คำตอบที่ถูกต้อง
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Explanation (if any) */}
              {q.explanation && (
                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-900 mt-2">
                  <span className="font-bold">คำอธิบายเฉลย: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDelete}
        title="ยืนยันการลบข้อสอบ"
        maxWidth="sm"
      >
        {deleteError && <Alert type="error" message={deleteError} className="mb-4" />}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              คุณต้องการลบข้อสอบข้อนี้ออกจากคลังข้อสอบหรือไม่?
              {selectedQuestion?._count.examQuestions && selectedQuestion._count.examQuestions > 0 ? (
                <span className="block text-slate-600 mt-1">
                  ข้อสอบนี้ผูกอยู่ในชุดแบบทดสอบ ({selectedQuestion._count.examQuestions} ชุด) หากยังไม่มีนักศึกษาเข้าสอบ ระบบจะนำออกจากชุดข้อสอบและลบออกจากคลังอย่างปลอดภัย แต่หากมีประวัติการเข้าสอบแล้ว ระบบจะป้องกันการลบเพื่อรักษาความถูกต้องของข้อมูลงานวิจัย
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseDelete}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleDelete}
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
