"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Loader2,
  Calendar,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Eye,
  Check,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";

interface ChoiceReview {
  id: string;
  choiceText: string;
  isCorrect: boolean;
}

interface QuestionReview {
  questionId: string;
  questionText: string;
  questionType: string;
  explanation?: string | null;
  earnedScore: number;
  isCorrect: boolean;
  selectedChoiceId?: string | null;
  selectedChoiceText?: string | null;
  choices: ChoiceReview[];
}

interface ExamResultData {
  attemptId: string;
  examId: string;
  examTitle: string;
  examType: string;
  courseCode: string;
  courseTitle: string;
  studentName: string;
  studentId?: string | null;
  totalScore: number;
  maxScore: number;
  passingScore: number;
  percentage: number;
  isPassed: boolean;
  status: string;
  startedAt: string;
  submittedAt?: string | null;
  timeSpentSeconds: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  allowReview: boolean;
  canReviewQuestions: boolean;
  reviewData?: QuestionReview[] | null;
}

export default function StudentExamResultPage({
  params,
}: {
  params: { id: string };
}) {
  const [result, setResult] = useState<ExamResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

  const fetchResult = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/exams/${params.id}/result`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "ไม่สามารถโหลดผลการสอบได้");
        return;
      }
      setResult(data.result);
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} นาที ${secs} วินาที`;
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <p className="text-sm font-semibold text-slate-700">กำลังประมวลผลและสรุปผลคะแนน...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Link
          href="/student/exams"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังรายการแบบทดสอบ
        </Link>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">ไม่สามารถแสดงผลการสอบ</h2>
          <p className="text-xs text-slate-500">{error || "ยังไม่มีข้อมูลผลการสอบ"}</p>
          <Link
            href="/student/exams"
            className="mt-4 inline-block px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            ไปยังหน้ารวมแบบทดสอบ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/student/exams"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 font-medium mb-2 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังรายการแบบทดสอบ
        </Link>
      </div>

      {/* Main Result Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Banner Status */}
        <div
          className={`p-6 sm:p-8 text-white ${
            result.isPassed
              ? "bg-gradient-to-r from-emerald-600 to-teal-700"
              : "bg-gradient-to-r from-rose-600 to-amber-700"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm mb-2">
                <FileSpreadsheet className="w-3.5 h-3.5" /> {result.courseCode} • {result.examType}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">{result.examTitle}</h1>
              <p className="text-xs text-white/80 mt-1">{result.courseTitle}</p>
            </div>

            <div className="text-right">
              <span
                className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold ${
                  result.isPassed ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"
                }`}
              >
                {result.isPassed ? "✓ ผ่านเกณฑ์ (Passed)" : "✗ ไม่ผ่านเกณฑ์ (Failed)"}
              </span>
            </div>
          </div>

          {/* Main Score Display */}
          <div className="mt-6 pt-6 border-t border-white/20 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
            <div>
              <span className="text-xs text-white/80 uppercase font-semibold tracking-wider">
                คะแนนรวมที่ได้
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-5xl font-extrabold font-mono">{result.totalScore}</span>
                <span className="text-xl text-white/80 font-medium">/ {result.maxScore} คะแนน</span>
              </div>
            </div>

            <div className="sm:text-right">
              <span className="text-xs text-white/80 uppercase font-semibold tracking-wider">
                คิดเป็นร้อยละ
              </span>
              <p className="text-4xl font-extrabold font-mono mt-1">
                {result.percentage.toFixed(1)}%
              </p>
              <p className="text-[11px] text-white/70">
                (เกณฑ์ผ่าน: {result.passingScore} คะแนน)
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/50 border-b border-slate-100">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 text-center">
            <span className="text-[11px] text-slate-400 font-medium">ข้อที่ตอบถูก</span>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">
              {result.correctCount} / {result.totalQuestions}
            </p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 text-center">
            <span className="text-[11px] text-slate-400 font-medium">ข้อที่ตอบผิด</span>
            <p className="text-xl font-bold text-rose-600 mt-0.5">{result.incorrectCount}</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 text-center">
            <span className="text-[11px] text-slate-400 font-medium">ไม่ได้ตอบ</span>
            <p className="text-xl font-bold text-slate-500 mt-0.5">{result.unansweredCount}</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 text-center">
            <span className="text-[11px] text-slate-400 font-medium">เวลาที่ใช้ทำ</span>
            <p className="text-sm font-bold text-slate-800 mt-1 truncate">
              {formatDuration(result.timeSpentSeconds)}
            </p>
          </div>
        </div>

        {/* Footer Meta Details */}
        <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="space-y-1">
            <div>
              <span className="text-slate-400">ผู้เข้าสอบ: </span>
              <span className="font-semibold text-slate-800">{result.studentName}</span>
              {result.studentId && (
                <span className="font-mono text-slate-500 ml-1">({result.studentId})</span>
              )}
            </div>
            <div>
              <span className="text-slate-400">ส่งข้อสอบเมื่อ: </span>
              <span>
                {result.submittedAt ? new Date(result.submittedAt).toLocaleString("th-TH") : "-"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {result.canReviewQuestions && (
              <button
                onClick={() => setShowReview(!showReview)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                {showReview ? "ซ่อนการทบทวนเฉลย" : "ดูเฉลยและคำอธิบาย"}
              </button>
            )}
            <Link
              href="/student/exams"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
            >
              เสร็จสิ้น
            </Link>
          </div>
        </div>
      </div>

      {/* Review Section (Accordion or Expanded view) */}
      {showReview && result.reviewData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" /> ทบทวนข้อสอบและเฉลยคำตอบ
            </h2>
            <span className="text-xs text-slate-500">ทั้งหมด {result.reviewData.length} ข้อ</span>
          </div>

          {result.reviewData.map((q, idx) => (
            <div
              key={q.questionId}
              className={`bg-white rounded-2xl border p-5 shadow-sm space-y-3 ${
                q.isCorrect ? "border-emerald-200 bg-emerald-50/10" : "border-rose-200 bg-rose-50/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center font-mono ${
                      q.isCorrect
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      q.isCorrect
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {q.isCorrect ? "ถูกต้อง" : "ไม่ถูกต้อง / ไม่ได้ตอบ"}
                  </span>
                </div>
                <span className="text-xs font-bold font-mono text-slate-700">
                  ได้ {q.earnedScore} คะแนน
                </span>
              </div>

              <div className="text-sm font-semibold text-slate-900 whitespace-pre-wrap">
                {q.questionText}
              </div>

              {/* Choices list */}
              <div className="space-y-2 pt-1">
                {q.choices.map((c, cIdx) => {
                  const isSelected = c.id === q.selectedChoiceId;
                  const isCorrectChoice = c.isCorrect;

                  let choiceStyle = "border-slate-200 bg-slate-50 text-slate-700";
                  if (isCorrectChoice) {
                    choiceStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold";
                  } else if (isSelected && !isCorrectChoice) {
                    choiceStyle = "border-rose-400 bg-rose-50 text-rose-950 line-through";
                  }

                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${choiceStyle}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isCorrectChoice
                              ? "bg-emerald-600 text-white"
                              : isSelected
                              ? "bg-rose-600 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {String.fromCharCode(65 + cIdx)}
                        </span>
                        <span>{c.choiceText}</span>
                      </div>

                      <div className="flex items-center gap-1.5 font-bold">
                        {isCorrectChoice && (
                          <span className="text-emerald-700 flex items-center gap-1 text-[11px]">
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> เฉลยที่ถูกต้อง
                          </span>
                        )}
                        {isSelected && !isCorrectChoice && (
                          <span className="text-rose-700 flex items-center gap-1 text-[11px]">
                            <X className="w-3.5 h-3.5 text-rose-600" /> คำตอบที่คุณเลือก
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation (if present) */}
              {q.explanation && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                  <div className="font-bold text-slate-800">คำอธิบายเพิ่มเติม:</div>
                  <p className="leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
