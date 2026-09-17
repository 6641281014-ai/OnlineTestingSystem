"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Clock,
  Layers,
  Loader2,
  HelpCircle,
  Edit2,
} from "lucide-react";
import { DifficultyBadge, QuestionTypeBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";

interface Choice {
  id: string;
  choiceText: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  difficulty: string;
  defaultScore: number;
  category?: { id: string; name: string } | null;
  choices: Choice[];
}

interface ExamQuestion {
  id: string;
  questionId: string;
  score: number;
  orderIndex: number;
  question: Question;
}

interface Exam {
  id: string;
  title: string;
  description?: string | null;
  examType: string;
  durationMinutes: number;
  totalScore: number;
  isPublished: boolean;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  course: { id: string; code: string; title: string };
}

export default function ExamBuilderPage({
  params,
}: {
  params: { id: string; examId: string };
}) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [assignedQuestions, setAssignedQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchExamAndQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const [examRes, questionsRes] = await Promise.all([
        fetch(`/api/exams/${params.examId}`),
        fetch(`/api/exams/${params.examId}/questions`),
      ]);

      const examData = await examRes.json();
      const questionsData = await questionsRes.json();

      if (examData.success) {
        setExam(examData.exam);
      }
      if (questionsData.success) {
        setAssignedQuestions(questionsData.assignedQuestions || []);
      }
    } catch {
      setFeedback({ type: "error", message: "ไม่สามารถโหลดข้อมูลชุดแบบทดสอบได้" });
    } finally {
      setLoading(false);
    }
  }, [params.examId]);

  useEffect(() => {
    fetchExamAndQuestions();
  }, [fetchExamAndQuestions]);

  const handleTogglePublish = async () => {
    if (!exam) return;
    try {
      const res = await fetch(`/api/exams/${exam.id}/publish`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
        setExam({ ...exam, isPublished: data.isPublished });
      } else {
        setFeedback({ type: "error", message: data.message || "ไม่สามารถเปลี่ยนสถานะได้" });
      }
    } catch {
      setFeedback({ type: "error", message: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์" });
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    if (!confirm("คุณต้องการนำข้อสอบข้อนี้ออกจากชุดแบบทดสอบหรือไม่?")) return;

    try {
      const res = await fetch(`/api/exams/${params.examId}/questions?questionId=${questionId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setFeedback({ type: "error", message: data.message || "ไม่สามารถนำข้อสอบออกได้" });
        return;
      }

      setFeedback({ type: "success", message: data.message });
      fetchExamAndQuestions();
    } catch {
      setFeedback({ type: "error", message: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์" });
    }
  };

  const totalCalculatedScore = assignedQuestions.reduce((sum, eq) => sum + eq.score, 0);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">กำลังโหลด Exam Builder...</p>
      </div>
    );
  }

  if (!exam) return null;

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
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-mono">
                {exam.course.code}
              </span>
              <span className="text-xs text-slate-500">{exam.examType}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {exam.title}
            </h1>
            <p className="text-slate-500 text-sm mt-1 max-w-3xl">
              {exam.description || "ไม่มีคำชี้แจง"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Main Publish Action Button */}
            {exam.isPublished ? (
              <button
                onClick={handleTogglePublish}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 shadow-sm transition"
                title="คลิกเพื่อปิดการสอบ (นักศึกษาจะไม่เห็นแบบทดสอบนี้)"
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                🔴 ปิดการสอบ (Unpublish)
              </button>
            ) : (
              <button
                onClick={handleTogglePublish}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition"
                title="คลิกเพื่อเปิดให้นักศึกษาเริ่มทำแบบทดสอบได้"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                🟢 เปิดให้นักเรียนทำแบบทดสอบ
              </button>
            )}

            <Link
              href={`/instructor/courses/${params.id}/exams/${exam.id}/edit`}
              className="p-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
              title="แก้ไขการตั้งค่า"
            >
              <Edit2 className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {feedback && <Alert type={feedback.type} message={feedback.message} className="mb-4" />}

      {/* Prominent Publishing Status Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
          exam.isPublished
            ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
            : "bg-amber-50/80 border-amber-300 text-amber-950"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${
              exam.isPublished
                ? "bg-emerald-600 text-white"
                : "bg-amber-500 text-white"
            }`}
          >
            {exam.isPublished ? "✓" : "!"}
          </div>
          <div>
            <div className="font-bold text-sm flex items-center gap-2">
              <span>สถานะแบบทดสอบ:</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  exam.isPublished
                    ? "bg-emerald-200 text-emerald-900"
                    : "bg-amber-200 text-amber-900"
                }`}
              >
                {exam.isPublished ? "🟢 เปิดให้นักเรียนทำแบบทดสอบแล้ว (Published)" : "🟡 ฉบับร่าง (Draft - นักเรียนยังไม่เห็น)"}
              </span>
            </div>
            <p className="text-xs mt-0.5 opacity-90">
              {exam.isPublished
                ? "เปิดแบบทดสอบให้นักเรียนเรียบร้อยแล้ว นักศึกษาที่ลงทะเบียนสามารถเข้าสู่ห้องสอบและเริ่มทำข้อสอบได้ทันที"
                : assignedQuestions.length > 0
                ? "มีข้อสอบในชุดแล้ว " + assignedQuestions.length + " ข้อ พร้อมเปิดให้นักศึกษาทำแบบทดสอบ คลิกปุ่ม 'เปิดให้นักเรียนทำแบบทดสอบ' เพื่อเริ่มเปิดสอบ"
                : "ยังไม่มีข้อสอบในชุดนี้ กรุณาเลือกข้อสอบจากคลังอย่างน้อย 1 ข้อ ก่อนเปิดสอบ"}
            </p>
          </div>
        </div>

        <div>
          {exam.isPublished ? (
            <button
              onClick={handleTogglePublish}
              className="px-4 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs shadow-sm transition whitespace-nowrap"
            >
              🔴 ปิดการสอบ
            </button>
          ) : (
            <button
              onClick={handleTogglePublish}
              disabled={assignedQuestions.length === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🟢 เปิดให้นักเรียนทำแบบทดสอบ
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">จำนวนข้อในชุด</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{assignedQuestions.length} ข้อ</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">คะแนนเต็มรวม</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{totalCalculatedScore} คะแนน</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">เวลาทำข้อสอบ</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{exam.durationMinutes} นาที</p>
        </div>
      </div>

      {/* Questions Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            ข้อสอบในชุดนี้ ({assignedQuestions.length} ข้อ)
          </h2>
        </div>

        {assignedQuestions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">ยังไม่มีข้อสอบในแบบทดสอบนี้</h3>
            <p className="text-xs text-slate-500 mt-1">
              สามารถสร้างแบบทดสอบและสุ่มข้อสอบใหม่ได้จากหน้า &quot;ชุดข้อสอบและแบบทดสอบ&quot;
            </p>
          </div>
        ) : (
          assignedQuestions.map((eq, idx) => (
            <div
              key={eq.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-200 transition space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <DifficultyBadge difficulty={eq.question.difficulty} />
                  <QuestionTypeBadge type={eq.question.questionType} />
                  {eq.question.category && (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {eq.question.category.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg font-mono">
                    {eq.score} คะแนน
                  </span>
                  <button
                    onClick={() => handleRemoveQuestion(eq.questionId)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="นำข้อสอบออกจากชุดนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-sm font-semibold text-slate-900 whitespace-pre-wrap">
                {eq.question.questionText}
              </div>

              {/* Choices preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {eq.question.choices.map((c, cIdx) => (
                  <div
                    key={c.id}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      c.isCorrect
                        ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium"
                        : "bg-slate-50/50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        c.isCorrect ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {String.fromCharCode(65 + cIdx)}
                    </span>
                    <span>{c.choiceText}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
