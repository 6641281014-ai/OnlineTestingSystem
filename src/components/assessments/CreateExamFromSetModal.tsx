"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Plus,
  Shuffle,
  Clock,
  CheckCircle2,
  Loader2,
  Sparkles,
  Layers,
  Filter,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";

interface Category {
  id: string;
  name: string;
}

interface CreateExamFromSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  questionSetId: string;
  questionSetTitle: string;
  totalQuestionsInSet: number;
  categories: Category[];
  onSuccess?: (examTitle?: string) => void;
}

export default function CreateExamFromSetModal({
  isOpen,
  onClose,
  courseId,
  questionSetId,
  questionSetTitle,
  totalQuestionsInSet,
  categories,
  onSuccess,
}: CreateExamFromSetModalProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [examType, setExamType] = useState<"QUIZ" | "MIDTERM" | "FINAL" | "PRE_TEST" | "POST_TEST">("QUIZ");
  const [questionCount, setQuestionCount] = useState(String(Math.min(totalQuestionsInSet || 20, 20)));
  const [scorePerQuestion, setScorePerQuestion] = useState("1");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [passingScore, setPassingScore] = useState("");

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState("ALL");
  const [selectedQuestionType, setSelectedQuestionType] = useState("ALL");

  // Options
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleChoices, setShuffleChoices] = useState(true);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(`แบบทดสอบจากชุด: ${questionSetTitle}`);
      setQuestionCount(String(Math.min(totalQuestionsInSet || 20, 20)));
      setError(null);
    }
  }, [isOpen, questionSetTitle, totalQuestionsInSet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("กรุณากรอกชื่อแบบทดสอบ");
      return;
    }

    const countNum = parseInt(questionCount, 10);
    if (isNaN(countNum) || countNum < 1) {
      setError("จำนวนข้อสอบต้องอย่างน้อย 1 ข้อ");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        `/api/courses/${courseId}/question-sets/${questionSetId}/generate-exam`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            examType,
            questionCount: countNum,
            scorePerQuestion: parseFloat(scorePerQuestion) || 1.0,
            durationMinutes: parseInt(durationMinutes, 10) || 60,
            passingScore: passingScore ? parseFloat(passingScore) : undefined,
            categoryId: selectedCategory,
            difficulty: selectedDifficulty,
            questionType: selectedQuestionType,
            shuffleQuestions,
            shuffleChoices,
            isPublished,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "เกิดข้อผิดพลาดในการสร้างแบบทดสอบ");
        setSubmitting(false);
        return;
      }

      onClose();
      if (onSuccess) {
        onSuccess(title.trim());
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างแบบทดสอบจากชุดข้อสอบ (Generate Exam)"
      maxWidth="xl"
    >
      {error && <Alert type="error" message={error} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อแบบทดสอบ *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น แบบทดสอบกลางภาค การเขียนโปรแกรม"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ประเภทแบบทดสอบ *
              </label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="QUIZ">แบบทดสอบย่อย (Quiz)</option>
                <option value="MIDTERM">แบบทดสอบกลางภาค (Midterm)</option>
                <option value="FINAL">แบบทดสอบปลายภาค (Final)</option>
                <option value="PRE_TEST">แบบทดสอบก่อนเรียน (Pre-test)</option>
                <option value="POST_TEST">แบบทดสอบหลังเรียน (Post-test)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ระยะเวลาทำข้อสอบ (นาที) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Question Picking & Sampling */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-indigo-950 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" /> การเลือกและสุ่มข้อสอบจากชุด:
            </span>
            <span className="text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full font-semibold">
              มีในชุดทั้งหมด {totalQuestionsInSet} ข้อ
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                จำนวนข้อที่ต้องการดึงเข้าแบบทดสอบ *
              </label>
              <input
                type="number"
                min="1"
                max={totalQuestionsInSet || 999}
                required
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                คะแนนต่อข้อ (Score per Question)
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={scorePerQuestion}
                onChange={(e) => setScorePerQuestion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                กรองตามหมวดหมู่
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ALL">ทุกหมวดหมู่</option>
                <option value="UNCATEGORIZED">ไม่มีหมวดหมู่</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                กรองตามความยาก
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ALL">ทุกระดับความยาก</option>
                <option value="EASY">ง่าย (Easy)</option>
                <option value="MEDIUM">ปานกลาง (Medium)</option>
                <option value="HARD">ยาก (Hard)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                ประเภทข้อสอบ
              </label>
              <select
                value={selectedQuestionType}
                onChange={(e) => setSelectedQuestionType(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ALL">ทุกประเภท</option>
                <option value="MULTIPLE_CHOICE">ปรนัย (Multiple Choice)</option>
                <option value="TRUE_FALSE">ถูก/ผิด (True/False)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Checkbox Options */}
        <div className="space-y-2 pt-1 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium">
              สุ่มลำดับข้อสอบ (Shuffle Questions) ให้ผู้เข้าสอบแต่ละคนได้ข้อไม่ตรงกัน
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={shuffleChoices}
              onChange={(e) => setShuffleChoices(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium">
              สุ่มลำดับตัวเลือก (Shuffle Choices) ในแต่ละข้อ
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium text-emerald-700 font-semibold">
              เปิดให้นักศึกษาเข้าสอบได้ทันทีหลังสร้างเสร็จ (Publish Exam)
            </span>
          </label>
        </div>

        {/* Submit Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> กำลังสร้างแบบทดสอบ...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" /> สร้างแบบทดสอบ
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
