"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Upload,
  Search,
  FolderTree,
  Trash2,
  Edit2,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  Layers,
  Sparkles,
  ChevronDown,
  Filter,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import { DifficultyBadge, QuestionTypeBadge } from "@/components/ui/Badge";
import FileImportModal from "@/components/assessments/FileImportModal";
import CreateExamFromSetModal from "@/components/assessments/CreateExamFromSetModal";

interface Choice {
  id: string;
  choiceText: string;
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

interface QuestionSetDetail {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function QuestionSetDetailPage({
  params,
}: {
  params: { id: string; setId: string };
}) {
  const [questionSet, setQuestionSet] = useState<QuestionSetDetail | null>(null);
  const [course, setCourse] = useState<{ id: string; code: string; title: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState(false);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  // Delete Question Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Manual Question Modal (Create / Edit)
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("MULTIPLE_CHOICE");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [defaultScore, setDefaultScore] = useState("1");
  const [explanation, setExplanation] = useState("");
  const [questionCategoryId, setQuestionCategoryId] = useState("");
  const [choices, setChoices] = useState<
    { id?: string; choiceText: string; isCorrect: boolean; orderIndex: number }[]
  >([
    { choiceText: "", isCorrect: true, orderIndex: 0 },
    { choiceText: "", isCorrect: false, orderIndex: 1 },
    { choiceText: "", isCorrect: false, orderIndex: 2 },
    { choiceText: "", isCorrect: false, orderIndex: 3 },
  ]);
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [questionModalError, setQuestionModalError] = useState<string | null>(null);

  const fetchSetData = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.set("search", search.trim());
      if (selectedCategory !== "ALL") queryParams.set("categoryId", selectedCategory);
      if (selectedDifficulty !== "ALL") queryParams.set("difficulty", selectedDifficulty);
      if (selectedType !== "ALL") queryParams.set("type", selectedType);

      const res = await fetch(
        `/api/courses/${params.id}/question-sets/${params.setId}?${queryParams.toString()}`
      );
      const data = await res.json();

      if (data.success) {
        setQuestionSet(data.questionSet);
        setCourse(data.course);
        setQuestions(data.questions);
        setCategories(data.categories);
        setTotalCount(data.totalCount);
      } else {
        setFeedback({ type: "error", message: data.message || "ไม่สามารถโหลดข้อมูลชุดข้อสอบได้" });
      }
    } catch {
      setFeedback({ type: "error", message: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์" });
    } finally {
      setLoading(false);
    }
  }, [params.id, params.setId, search, selectedCategory, selectedDifficulty, selectedType]);

  useEffect(() => {
    fetchSetData();
  }, [fetchSetData]);

  // Create Category Handler
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setCategorySubmitting(true);
    try {
      const res = await fetch(`/api/courses/${params.id}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCategoryName("");
        setIsCreateCategoryModalOpen(false);
        setFeedback({ type: "success", message: "สร้างหมวดหมู่ใหม่สำเร็จ" });
        fetchSetData();
      } else {
        setFeedback({ type: "error", message: data.message || "ไม่สามารถสร้างหมวดหมู่ได้" });
      }
    } catch {
      setFeedback({ type: "error", message: "เกิดข้อผิดพลาดในการสร้างหมวดหมู่" });
    } finally {
      setCategorySubmitting(false);
    }
  };

  // Open Create Manual Question Modal
  const handleOpenCreateQuestion = () => {
    setEditingQuestionId(null);
    setQuestionText("");
    setQuestionType("MULTIPLE_CHOICE");
    setDifficulty("MEDIUM");
    setDefaultScore("1");
    setExplanation("");
    setQuestionCategoryId("");
    setChoices([
      { choiceText: "", isCorrect: true, orderIndex: 0 },
      { choiceText: "", isCorrect: false, orderIndex: 1 },
      { choiceText: "", isCorrect: false, orderIndex: 2 },
      { choiceText: "", isCorrect: false, orderIndex: 3 },
    ]);
    setQuestionModalError(null);
    setIsQuestionModalOpen(true);
  };

  // Open Edit Manual Question Modal
  const handleOpenEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setQuestionText(q.questionText);
    setQuestionType(q.questionType);
    setDifficulty(q.difficulty);
    setDefaultScore(String(q.defaultScore));
    setExplanation(q.explanation || "");
    setQuestionCategoryId(q.category?.id || "");
    setChoices(
      q.choices.map((c, idx) => ({
        id: c.id,
        choiceText: c.choiceText,
        isCorrect: c.isCorrect,
        orderIndex: c.orderIndex ?? idx,
      }))
    );
    setQuestionModalError(null);
    setIsQuestionModalOpen(true);
  };

  // Save Manual Question
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuestionModalError(null);

    if (!questionText.trim()) {
      setQuestionModalError("กรุณากรอกข้อความโจทย์");
      return;
    }

    const filledChoices = choices.filter((c) => c.choiceText.trim().length > 0);
    if (filledChoices.length < 2) {
      setQuestionModalError("ต้องมีตัวเลือกอย่างน้อย 2 ตัวเลือก");
      return;
    }

    const hasCorrect = filledChoices.some((c) => c.isCorrect);
    if (!hasCorrect) {
      setQuestionModalError("กรุณาเลือกตัวเลือกที่ถูกต้องอย่างน้อย 1 ตัวเลือก");
      return;
    }

    setQuestionSubmitting(true);

    try {
      const payload = {
        questionText: questionText.trim(),
        questionType,
        difficulty,
        defaultScore: parseFloat(defaultScore) || 1.0,
        explanation: explanation.trim() || null,
        categoryId: questionCategoryId || null,
        questionSetId: params.setId,
        choices: filledChoices.map((c, idx) => ({
          choiceText: c.choiceText.trim(),
          isCorrect: c.isCorrect,
          orderIndex: idx,
        })),
      };

      let res: Response;
      if (editingQuestionId) {
        res = await fetch(`/api/questions/${editingQuestionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/courses/${params.id}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        setQuestionModalError(data.message || "เกิดข้อผิดพลาดในการบันทึกข้อสอบ");
        setQuestionSubmitting(false);
        return;
      }

      setIsQuestionModalOpen(false);
      setFeedback({
        type: "success",
        message: editingQuestionId ? "แก้ไขข้อสอบสำเร็จ" : "เพิ่มข้อสอบใหม่เข้าชุดสำเร็จ",
      });
      fetchSetData();
    } catch {
      setQuestionModalError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setQuestionSubmitting(false);
    }
  };

  // Delete Question
  const handleOpenDelete = (q: Question) => {
    setSelectedQuestion(q);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteQuestion = async () => {
    if (!selectedQuestion) return;
    setDeleteSubmitting(true);

    try {
      const res = await fetch(`/api/questions/${selectedQuestion.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: "error", message: data.message || "ไม่สามารถลบข้อสอบได้" });
      } else {
        setIsDeleteModalOpen(false);
        setFeedback({ type: "success", message: "ลบข้อสอบเรียบร้อยแล้ว" });
        fetchSetData();
      }
    } catch {
      setFeedback({ type: "error", message: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์" });
    } finally {
      setDeleteSubmitting(false);
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
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังชุดข้อสอบและแบบทดสอบ ({course?.code})
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700">
                ชุดข้อสอบ
              </span>
              <span className="text-xs text-slate-400">ทั้งหมด {totalCount} ข้อ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {questionSet?.title || "กำลังโหลด..."}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              {questionSet?.description || "ไม่มีคำอธิบายชุดข้อสอบ"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCreateCategoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition shadow-sm"
            >
              <FolderTree className="w-3.5 h-3.5 text-indigo-600" /> + หมวดหมู่
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition"
            >
              <Upload className="w-3.5 h-3.5" /> นำเข้าข้อสอบจากไฟล์
            </button>
            <button
              onClick={handleOpenCreateQuestion}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มข้อสอบทีละข้อ
            </button>
            <button
              onClick={() => setIsCreateExamModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition"
            >
              <Sparkles className="w-3.5 h-3.5" /> สร้างแบบทดสอบจากชุดนี้
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.message}
        />
      )}

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาข้อความในโจทย์..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="ALL">ทุกหมวดหมู่ ({categories.length})</option>
            <option value="UNCATEGORIZED">ไม่มีหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="ALL">ทุกระดับความยาก</option>
            <option value="EASY">ง่าย (Easy)</option>
            <option value="MEDIUM">ปานกลาง (Medium)</option>
            <option value="HARD">ยาก (Hard)</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="ALL">ทุกประเภทข้อสอบ</option>
            <option value="MULTIPLE_CHOICE">ปรนัย</option>
            <option value="TRUE_FALSE">ถูก/ผิด</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">กำลังโหลดรายการข้อสอบ...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {search || selectedCategory !== "ALL" || selectedDifficulty !== "ALL"
              ? "ไม่พบข้อสอบที่ตรงกับเงื่อนไขการค้นหา"
              : "ยังไม่มีข้อสอบในชุดนี้"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            คุณสามารถนำเข้าข้อสอบจากไฟล์ Word (.docx), Excel (.xlsx), หรือเพิ่มข้อสอบรายข้อได้ทันที
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Upload className="w-4 h-4" /> นำเข้าจากไฟล์
            </button>
            <button
              onClick={handleOpenCreateQuestion}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
            >
              <Plus className="w-4 h-4" /> เพิ่มทีละข้อ
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-300 transition"
            >
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                    {idx + 1}
                  </span>
                  <DifficultyBadge difficulty={q.difficulty} />
                  <QuestionTypeBadge type={q.questionType} />
                  {q.category && (
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                      {q.category.name}
                    </span>
                  )}
                  <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    {q.defaultScore} คะแนน
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditQuestion(q)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="แก้ไขข้อสอบ"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenDelete(q)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="ลบข้อสอบ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="font-semibold text-slate-900 text-sm mb-3">
                {q.questionText}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.choices.map((c, cIdx) => (
                  <div
                    key={c.id}
                    className={`p-2.5 rounded-xl text-xs flex items-center justify-between ${
                      c.isCorrect
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium"
                        : "bg-slate-50 border border-slate-100 text-slate-700"
                    }`}
                  >
                    <span className="truncate pr-2">
                      <span className="font-bold mr-1.5">
                        {String.fromCharCode(65 + cIdx)}.
                      </span>
                      {c.choiceText}
                    </span>
                    {c.isCorrect && (
                      <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded shrink-0">
                        เฉลย
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {q.explanation && (
                <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">คำอธิบาย:</span> {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Category Modal */}
      <Modal
        isOpen={isCreateCategoryModalOpen}
        onClose={() => setIsCreateCategoryModalOpen(false)}
        title="เพิ่มหมวดหมู่ข้อสอบใหม่"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อหมวดหมู่ *
            </label>
            <input
              type="text"
              required
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="เช่น พื้นฐาน HTML, ตัวแปร, ฟังก์ชัน"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateCategoryModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={categorySubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-70"
            >
              {categorySubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              บันทึกหมวดหมู่
            </button>
          </div>
        </form>
      </Modal>

      {/* Create / Edit Question Modal */}
      <Modal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        title={editingQuestionId ? "แก้ไขข้อสอบ" : "เพิ่มข้อสอบใหม่เข้าชุด"}
        maxWidth="xl"
      >
        {questionModalError && <Alert type="error" message={questionModalError} className="mb-4" />}

        <form onSubmit={handleSaveQuestion} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ข้อความโจทย์ / คำถาม *
            </label>
            <textarea
              rows={3}
              required
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="ระบุข้อความคำถาม..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมวดหมู่
              </label>
              <select
                value={questionCategoryId}
                onChange={(e) => setQuestionCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">ไม่มีหมวดหมู่</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ระดับความยาก
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="EASY">ง่าย (Easy)</option>
                <option value="MEDIUM">ปานกลาง (Medium)</option>
                <option value="HARD">ยาก (Hard)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                คะแนนข้อนี้
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={defaultScore}
                onChange={(e) => setDefaultScore(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Choices Form */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                ตัวเลือกคำตอบ (เลือก Radio เพื่อระบุข้อที่ถูกต้อง) *
              </label>
            </div>

            {choices.map((c, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct-choice"
                  checked={c.isCorrect}
                  onChange={() => {
                    setChoices((prev) =>
                      prev.map((item, i) => ({ ...item, isCorrect: i === idx }))
                    );
                  }}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  title="คลิกเพื่อตั้งให้เป็นเฉลย"
                />
                <span className="text-xs font-bold text-slate-500 w-5">
                  {String.fromCharCode(65 + idx)}.
                </span>
                <input
                  type="text"
                  value={c.choiceText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setChoices((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, choiceText: val } : item))
                    );
                  }}
                  placeholder={`ข้อความตัวเลือกที่ ${idx + 1}`}
                  className={`flex-1 px-3 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-indigo-500 ${
                    c.isCorrect ? "border-emerald-400 bg-emerald-50/40" : "border-slate-200"
                  }`}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              คำอธิบายเฉลย (Explanation)
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="คำอธิบายเพิ่มเติมสำหรับแสดงหลังตรวจข้อสอบ..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsQuestionModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={questionSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-70"
            >
              {questionSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              บันทึกข้อสอบ
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Question Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="ยืนยันการลบข้อสอบ"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            คุณต้องการลบข้อสอบข้อนี้หรือไม่? หากข้อสอบนี้ถูกนำไปใช้ในแบบทดสอบที่กำลังสอบหรือมีนักศึกษาตอบแล้ว ระบบจะป้องกันไม่ให้ลบ
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleDeleteQuestion}
              disabled={deleteSubmitting}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition flex items-center gap-1.5 disabled:opacity-70"
            >
              {deleteSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              ยืนยันการลบ
            </button>
          </div>
        </div>
      </Modal>

      {/* File Import Modal */}
      <FileImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        courseId={params.id}
        questionSetId={params.setId}
        onImportSuccess={(savedCount) => {
          setFeedback({ type: "success", message: `นำเข้าข้อสอบเข้าสู่ชุดสำเร็จ ${savedCount} ข้อ` });
          fetchSetData();
        }}
      />

      {/* Create Exam From Set Modal */}
      <CreateExamFromSetModal
        isOpen={isCreateExamModalOpen}
        onClose={() => setIsCreateExamModalOpen(false)}
        courseId={params.id}
        questionSetId={params.setId}
        questionSetTitle={questionSet?.title || ""}
        totalQuestionsInSet={totalCount}
        categories={categories}
        onSuccess={(createdTitle) => {
          setFeedback({
            type: "success",
            message: `สร้างแบบทดสอบ${createdTitle ? ` "${createdTitle}"` : ""}เรียบร้อยแล้ว`,
          });
        }}
      />
    </div>
  );
}
