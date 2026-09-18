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
  ChevronRight,
  GraduationCap,
  Sparkles,
  CheckCircle,
} from "lucide-react";

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
        <p className="text-xs text-slate-400">ระบบกำลังวิเคราะห์ผลสัมฤทธิ์และคำตอบรายข้อ</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <Link href="/student/dashboard" className="hover:text-emerald-600 transition flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5" /> แดชบอร์ด
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <Link href="/student/exams" className="hover:text-emerald-600 transition">
            แบบทดสอบออนไลน์
          </Link>
        </nav>
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">ไม่สามารถแสดงผลการสอบ</h2>
          <p className="text-xs text-slate-500">{error || "ยังไม่มีข้อมูลผลการสอบสำหรับผู้เรียน"}</p>
          <div className="pt-2">
            <Link
              href="/student/exams"
              className="inline-block px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
            >
              กลับไปยังหน้ารวมแบบทดสอบ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Academic Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link
          href="/student/dashboard"
          className="hover:text-emerald-600 transition flex items-center gap-1"
        >
          <GraduationCap className="w-3.5 h-3.5" /> แดชบอร์ด
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <Link href="/student/exams" className="hover:text-emerald-600 transition">
          แบบทดสอบออนไลน์
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-700 font-semibold truncate max-w-xs sm:max-w-sm">
          รายงานผลคะแนน: {result.examTitle}
        </span>
      </nav>

      {/* 2. Main Result Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Banner Status */}
        <div
          className={`p-6 sm:p-8 text-white relative ${
            result.isPassed
              ? "bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800"
              : "bg-gradient-to-br from-slate-900 via-rose-900/90 to-rose-950"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm">
                <FileSpreadsheet className="w-3.5 h-3.5 text-white/90" /> {result.courseCode} • {result.examType}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{result.examTitle}</h1>
              <p className="text-xs text-white/80 font-medium">{result.courseTitle}</p>
            </div>

            <div>
              <span
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold shadow-sm ${
                  result.isPassed
                    ? "bg-white text-emerald-800"
                    : "bg-rose-100 text-rose-900"
                }`}
              >
                {result.isPassed ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> ผ่านเกณฑ์การประเมิน (Passed)
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600" /> ไม่ผ่านเกณฑ์ (Needs Improvement)
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Main Score Display */}
          <div className="mt-8 pt-6 border-t border-white/20 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
            <div>
              <span className="text-xs text-white/80 uppercase font-semibold tracking-wider">
                คะแนนรวมที่ได้ (Total Score)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight">
                  {result.totalScore}
                </span>
                <span className="text-xl text-white/80 font-medium">/ {result.maxScore} คะแนน</span>
              </div>
            </div>

            <div className="sm:text-right">
              <span className="text-xs text-white/80 uppercase font-semibold tracking-wider">
                คิดเป็นร้อยละ (Percentage)
              </span>
              <p className="text-4xl sm:text-5xl font-black font-mono mt-1">
                {result.percentage.toFixed(1)}%
              </p>
              <p className="text-xs text-white/75 mt-1 font-medium">
                เกณฑ์ผ่าน: {result.passingScore} คะแนน
              </p>
            </div>
          </div>
        </div>

        {/* Diagnostic KPI Grid */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 border-b border-slate-100">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 text-center">
            <span className="text-[11px] text-slate-400 font-medium">ข้อที่ตอบถูก</span>
            <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">
              {result.correctCount} / {result.totalQuestions}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 text-center">
            <span className="text-[11px] text-slate-400 font-medium">ข้อที่ตอบผิด</span>
            <p className="text-2xl font-black text-rose-600 mt-1 font-mono">{result.incorrectCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 text-center">
            <span className="text-[11px] text-slate-400 font-medium">ไม่ได้ตอบ</span>
            <p className="text-2xl font-black text-slate-500 mt-1 font-mono">{result.unansweredCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 text-center">
            <span className="text-[11px] text-slate-400 font-medium">เวลาที่ใช้ทำ</span>
            <p className="text-sm font-bold text-slate-800 mt-2 truncate">
              {formatDuration(result.timeSpentSeconds)}
            </p>
          </div>
        </div>

        {/* Footer Meta Details */}
        <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="space-y-1 text-center sm:text-left">
            <div>
              <span className="text-slate-400">ผู้เข้าสอบ: </span>
              <strong className="text-slate-800">{result.studentName}</strong>
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

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {result.canReviewQuestions && (
              <button
                onClick={() => setShowReview(!showReview)}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                {showReview ? "ซ่อนการทบทวนเฉลย" : "ดูเฉลยและคำอธิบาย"}
              </button>
            )}
            <Link
              href="/student/exams"
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 text-center transition"
            >
              เสร็จสิ้น
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Pedagogical Review Section */}
      {showReview && result.reviewData && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" /> ทบทวนข้อสอบและเฉลยคำตอบ
            </h2>
            <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">
              ทั้งหมด {result.reviewData.length} ข้อ
            </span>
          </div>

          {result.reviewData.map((q, idx) => (
            <div
              key={q.questionId}
              className={`bg-white rounded-3xl border p-6 shadow-sm space-y-4 transition ${
                q.isCorrect ? "border-emerald-200/80 bg-emerald-50/10" : "border-rose-200/80 bg-rose-50/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center font-mono ${
                      q.isCorrect
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      q.isCorrect
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {q.isCorrect ? "ตอบถูกต้อง" : "ไม่ถูกต้อง / ไม่ได้ตอบ"}
                  </span>
                </div>
                <span className="text-xs font-bold font-mono text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                  ได้ {q.earnedScore} คะแนน
                </span>
              </div>

              <div className="text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
                {q.questionText}
              </div>

              {/* Choices list */}
              <div className="space-y-2 pt-1">
                {q.choices.map((c, cIdx) => {
                  const isSelected = c.id === q.selectedChoiceId;
                  const isCorrectChoice = c.isCorrect;

                  let choiceStyle = "border-slate-200 bg-slate-50 text-slate-700";
                  if (isCorrectChoice) {
                    choiceStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-500";
                  } else if (isSelected && !isCorrectChoice) {
                    choiceStyle = "border-rose-400 bg-rose-50 text-rose-950 line-through";
                  }

                  return (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition ${choiceStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                            isCorrectChoice
                              ? "bg-emerald-600 text-white"
                              : isSelected
                              ? "bg-rose-600 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {String.fromCharCode(65 + cIdx)}
                        </span>
                        <span className="text-sm">{c.choiceText}</span>
                      </div>

                      <div className="flex items-center gap-1.5 font-bold">
                        {isCorrectChoice && (
                          <span className="text-emerald-700 flex items-center gap-1 text-[11px] bg-emerald-100/80 px-2 py-0.5 rounded-lg">
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> เฉลยที่ถูกต้อง
                          </span>
                        )}
                        {isSelected && !isCorrectChoice && (
                          <span className="text-rose-700 flex items-center gap-1 text-[11px] bg-rose-100/80 px-2 py-0.5 rounded-lg">
                            <X className="w-3.5 h-3.5 text-rose-600" /> คำตอบที่คุณเลือก
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {q.explanation && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> คำอธิบายและแนวคิดทางการศึกษา:
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

