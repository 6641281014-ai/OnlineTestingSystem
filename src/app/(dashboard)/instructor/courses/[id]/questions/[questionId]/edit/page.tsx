"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Trash2,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";

interface Category {
  id: string;
  name: string;
}

interface Choice {
  id?: string;
  choiceText: string;
  isCorrect: boolean;
  orderIndex?: number;
}

export default function EditQuestionPage({
  params,
}: {
  params: { id: string; questionId: string };
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"MULTIPLE_CHOICE" | "TRUE_FALSE">("MULTIPLE_CHOICE");
  const [categoryId, setCategoryId] = useState("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [defaultScore, setDefaultScore] = useState("1.0");
  const [explanation, setExplanation] = useState("");
  const [multipleChoices, setMultipleChoices] = useState<Choice[]>([]);
  const [trueFalseCorrect, setTrueFalseCorrect] = useState<"TRUE" | "FALSE">("TRUE");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestionAndCats = useCallback(async () => {
    try {
      setLoading(true);
      const [catsRes, qRes] = await Promise.all([
        fetch(`/api/courses/${params.id}/categories`),
        fetch(`/api/questions/${params.questionId}`),
      ]);

      const catsData = await catsRes.json();
      const qData = await qRes.json();

      if (catsData.success) setCategories(catsData.categories);
      if (qData.success) {
        const q = qData.question;
        setQuestionText(q.questionText);
        setQuestionType(q.questionType);
        setCategoryId(q.categoryId || "");
        setDifficulty(q.difficulty);
        setDefaultScore(String(q.defaultScore));
        setExplanation(q.explanation || "");

        if (q.questionType === "MULTIPLE_CHOICE") {
          setMultipleChoices(
            q.choices.map((c: Choice) => ({
              id: c.id,
              choiceText: c.choiceText,
              isCorrect: c.isCorrect,
            }))
          );
        } else {
          const trueChoice = q.choices.find((c: Choice) => c.choiceText.includes("จริง") || c.choiceText.includes("True"));
          setTrueFalseCorrect(trueChoice?.isCorrect ? "TRUE" : "FALSE");
        }
      }
    } catch {
      setError("ไม่สามารถโหลดข้อมูลข้อสอบได้");
    } finally {
      setLoading(false);
    }
  }, [params.id, params.questionId]);

  useEffect(() => {
    fetchQuestionAndCats();
  }, [fetchQuestionAndCats]);

  const handleAddChoice = () => {
    if (multipleChoices.length >= 6) return;
    setMultipleChoices([...multipleChoices, { choiceText: "", isCorrect: false }]);
  };

  const handleRemoveChoice = (idx: number) => {
    if (multipleChoices.length <= 2) return;
    const isRemovingCorrect = multipleChoices[idx].isCorrect;
    const updated = multipleChoices.filter((_, i) => i !== idx);
    if (isRemovingCorrect && updated.length > 0) {
      updated[0].isCorrect = true;
    }
    setMultipleChoices(updated);
  };

  const handleChoiceTextChange = (idx: number, text: string) => {
    const updated = [...multipleChoices];
    updated[idx].choiceText = text;
    setMultipleChoices(updated);
  };

  const handleSetCorrectChoice = (idx: number) => {
    const updated = multipleChoices.map((c, i) => ({
      ...c,
      isCorrect: i === idx,
    }));
    setMultipleChoices(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!questionText.trim()) {
      setError("กรุณากรอกโจทย์คำถาม");
      return;
    }

    const scoreNum = parseFloat(defaultScore);
    if (isNaN(scoreNum) || scoreNum <= 0) {
      setError("คะแนนต้องเป็นตัวเลขที่มากกว่า 0");
      return;
    }

    let choicesPayload;
    if (questionType === "MULTIPLE_CHOICE") {
      const emptyChoice = multipleChoices.some((c) => !c.choiceText.trim());
      if (emptyChoice) {
        setError("กรุณากรอกข้อความตัวเลือกให้ครบทุกข้อ");
        return;
      }
      const hasCorrect = multipleChoices.some((c) => c.isCorrect);
      if (!hasCorrect) {
        setError("กรุณาเลือกคำตอบที่ถูกต้อง 1 ตัวเลือก");
        return;
      }
      choicesPayload = multipleChoices.map((c, idx) => ({
        choiceText: c.choiceText.trim(),
        isCorrect: c.isCorrect,
        orderIndex: idx + 1,
      }));
    } else {
      choicesPayload = [
        {
          choiceText: "จริง / ถูก (True)",
          isCorrect: trueFalseCorrect === "TRUE",
          orderIndex: 1,
        },
        {
          choiceText: "เท็จ / ผิด (False)",
          isCorrect: trueFalseCorrect === "FALSE",
          orderIndex: 2,
        },
      ];
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/questions/${params.questionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: categoryId || null,
          questionText: questionText.trim(),
          questionType,
          difficulty,
          defaultScore: scoreNum,
          explanation: explanation.trim() || null,
          choices: choicesPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "เกิดข้อผิดพลาดในการแก้ไขข้อสอบ");
        setSubmitting(false);
        return;
      }

      router.push(`/instructor/courses/${params.id}/questions`);
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">กำลังโหลดข้อมูลข้อสอบ...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/instructor/courses/${params.id}/questions`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium mb-3 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังคลังข้อสอบ
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          แก้ไขข้อสอบ
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          ปรับปรุงโจทย์คำถาม ตัวเลือก คำตอบที่ถูกต้อง หรือคะแนน
        </p>
      </div>

      {error && <Alert type="error" message={error} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            1. ข้อมูลพื้นฐานของข้อสอบ
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ประเภทข้อสอบ
              </label>
              <select
                disabled
                value={questionType}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-100 text-slate-500 font-medium cursor-not-allowed"
              >
                <option value="MULTIPLE_CHOICE">ปรนัย 4-5 ตัวเลือก</option>
                <option value="TRUE_FALSE">ถูก / ผิด (True / False)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                หมวดหมู่ / บทเรียน
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">-- ไม่ระบุหมวดหมู่ --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ความยาก *
                </label>
                <select
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="EASY">ง่าย</option>
                  <option value="MEDIUM">ปานกลาง</option>
                  <option value="HARD">ยาก</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  คะแนน *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={defaultScore}
                  onChange={(e) => setDefaultScore(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-center font-bold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              โจทย์คำถาม (Question Text) *
            </label>
            <textarea
              rows={4}
              required
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Choices Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                2. ตัวเลือกและคำตอบที่ถูกต้อง
              </h2>
              <p className="text-xs text-slate-500">
                เลือกปุ่มวงกลมเพื่อระบุคำตอบที่ถูกต้อง
              </p>
            </div>
            {questionType === "MULTIPLE_CHOICE" && multipleChoices.length < 6 && (
              <button
                type="button"
                onClick={handleAddChoice}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มตัวเลือก
              </button>
            )}
          </div>

          {questionType === "MULTIPLE_CHOICE" ? (
            <div className="space-y-3">
              {multipleChoices.map((choice, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition flex items-center gap-3 ${
                    choice.isCorrect
                      ? "bg-emerald-50/50 border-emerald-300"
                      : "bg-slate-50/50 border-slate-200"
                  }`}
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                    <input
                      type="radio"
                      name="correct_choice_edit"
                      checked={choice.isCorrect}
                      onChange={() => handleSetCorrectChoice(idx)}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        choice.isCorrect
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                  </label>

                  <input
                    type="text"
                    required
                    value={choice.choiceText}
                    onChange={(e) => handleChoiceTextChange(idx, e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                  />

                  {choice.isCorrect && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-100 px-2 py-1 rounded">
                      <CheckCircle2 className="w-3.5 h-3.5" /> คำตอบที่ถูก
                    </span>
                  )}

                  {multipleChoices.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveChoice(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="ลบตัวเลือก"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition ${
                  trueFalseCorrect === "TRUE"
                    ? "bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="tf_correct_edit"
                  checked={trueFalseCorrect === "TRUE"}
                  onChange={() => setTrueFalseCorrect("TRUE")}
                  className="w-4 h-4 text-emerald-600"
                />
                <div>
                  <div className="font-bold text-sm">จริง / ถูก (True)</div>
                </div>
              </label>

              <label
                className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition ${
                  trueFalseCorrect === "FALSE"
                    ? "bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="tf_correct_edit"
                  checked={trueFalseCorrect === "FALSE"}
                  onChange={() => setTrueFalseCorrect("FALSE")}
                  className="w-4 h-4 text-emerald-600"
                />
                <div>
                  <div className="font-bold text-sm">เท็จ / ผิด (False)</div>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Explanation Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            3. คำอธิบายเฉลย (Explanation)
          </h2>
          <textarea
            rows={3}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="อธิบายเหตุผลหรือวิธีคิดของข้อนี้..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={`/instructor/courses/${params.id}/questions`}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm transition"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition flex items-center gap-2 disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                บันทึกการแก้ไข
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
