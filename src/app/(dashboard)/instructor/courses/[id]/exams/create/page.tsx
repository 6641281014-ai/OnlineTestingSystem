"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileSpreadsheet,
  Plus,
  Loader2,
  Clock,
  Calendar,
  Shuffle,
  ShieldCheck,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";

export default function CreateExamPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [examType, setExamType] = useState<"PRE_TEST" | "POST_TEST" | "QUIZ" | "MIDTERM" | "FINAL">("QUIZ");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [passingScore, setPassingScore] = useState("0");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleChoices, setShuffleChoices] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [showScoreImmediately, setShowScoreImmediately] = useState(true);
  const [isPublished, setIsPublished] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("กรุณากรอกชื่อชุดแบบทดสอบ");
      return;
    }

    const durationNum = parseInt(durationMinutes, 10);
    if (isNaN(durationNum) || durationNum < 1) {
      setError("ระยะเวลาทำข้อสอบต้องอย่างน้อย 1 นาที");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/courses/${params.id}/exams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          examType,
          durationMinutes: durationNum,
          passingScore: parseFloat(passingScore) || 0,
          startTime: startTime ? new Date(startTime).toISOString() : null,
          endTime: endTime ? new Date(endTime).toISOString() : null,
          shuffleQuestions,
          shuffleChoices,
          maxAttempts: parseInt(maxAttempts, 10) || 1,
          showScoreImmediately,
          isPublished,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "เกิดข้อผิดพลาดในการสร้างแบบทดสอบ");
        setSubmitting(false);
        return;
      }

      // Redirect to Exam Builder Hub to select questions
      router.push(`/instructor/courses/${params.id}/exams/${data.exam.id}`);
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/instructor/courses/${params.id}/exams`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium mb-3 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังรายการแบบทดสอบ
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          สร้างชุดแบบทดสอบใหม่
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          กำหนดชื่อ ประเภท ระยะเวลาทำข้อสอบ และตั้งค่าระบบสุ่มคำถาม
        </p>
      </div>

      {error && <Alert type="error" message={error} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Settings Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            1. ข้อมูลพื้นฐานของแบบทดสอบ
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ชื่อชุดแบบทดสอบ *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น แบบทดสอบวัดผลสัมฤทธิ์ทางการเรียนก่อนเรียน (Pre-test)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ประเภทการทดสอบ *
              </label>
              <select
                value={examType}
                onChange={(e) =>
                  setExamType(e.target.value as "PRE_TEST" | "POST_TEST" | "QUIZ" | "MIDTERM" | "FINAL")
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
              >
                <option value="PRE_TEST">แบบทดสอบก่อนเรียน (Pre-test)</option>
                <option value="POST_TEST">แบบทดสอบหลังเรียน (Post-test)</option>
                <option value="QUIZ">แบบทดสอบย่อย (Quiz)</option>
                <option value="MIDTERM">สอบกลางภาค (Midterm)</option>
                <option value="FINAL">สอบปลายภาค (Final)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              คำชี้แจง / คำแนะนำในการทำข้อสอบ
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น ให้นักศึกษาเลือกคำตอบที่ถูกต้องที่สุดเพียงข้อเดียว ห้ามสลับหน้าจอระหว่างทำข้อสอบ..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Time and Duration Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" /> 2. กำหนดเวลาและเกณฑ์การสอบ
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ระยะเวลาทำข้อสอบ (นาที) *
              </label>
              <input
                type="number"
                min="1"
                max="360"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                วัน-เวลาเปิดสอบ (Start Time)
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                วัน-เวลาปิดสอบ (End Time)
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Anti-Cheat & Randomization Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Shuffle className="w-4 h-4 text-indigo-600" /> 3. การสุ่มข้อสอบและการแสดงผล
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="w-4 h-4 text-indigo-600 mt-0.5 rounded"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">สุ่มลำดับข้อสอบ (Shuffle Questions)</span>
                <span className="text-[11px] text-slate-500">นักศึกษาแต่ละคนจะได้รับลำดับข้อสอบไม่เหมือนกัน</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleChoices}
                onChange={(e) => setShuffleChoices(e.target.checked)}
                className="w-4 h-4 text-indigo-600 mt-0.5 rounded"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">สุ่มลำดับตัวเลือก (Shuffle Choices)</span>
                <span className="text-[11px] text-slate-500">สลับลำดับตัวเลือก ก, ข, ค, ง เพื่อลดการทุจริต</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={showScoreImmediately}
                onChange={(e) => setShowScoreImmediately(e.target.checked)}
                className="w-4 h-4 text-indigo-600 mt-0.5 rounded"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">แสดงคะแนนทันทีหลังส่ง</span>
                <span className="text-[11px] text-slate-500">นักศึกษาจะเห็นคะแนนรวมทันทีที่กดส่งแบบทดสอบ</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-indigo-600 mt-0.5 rounded"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">เปิดให้นักศึกษาเข้าสอบทันที (Publish)</span>
                <span className="text-[11px] text-slate-500">หากปิดไว้ จะอยู่ในสถานะแบบร่าง (Draft)</span>
              </div>
            </label>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={`/instructor/courses/${params.id}/exams`}
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
                <Plus className="w-4 h-4" />
                บันทึกและไปเลือกข้อสอบเข้าชุด
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
