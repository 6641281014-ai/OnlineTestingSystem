"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Layers,
  Send,
  ShieldAlert,
  Save,
  Award,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { DifficultyBadge, QuestionTypeBadge } from "@/components/ui/Badge";

interface Choice {
  id: string;
  choiceText: string;
  orderIndex: number;
}

interface Question {
  id: string;
  orderIndex: number;
  score: number;
  questionText: string;
  questionType: string;
  difficulty: string;
  categoryName?: string | null;
  choices: Choice[];
}

interface ExamSession {
  attemptId: string;
  startedAt: string;
  durationMinutes: number;
  deadlineAt: string;
  serverTime: string;
  examTitle: string;
  courseCode: string;
  courseTitle: string;
  totalScore: number;
  questions: Question[];
  savedAnswers: Record<string, { selectedChoiceId?: string | null }>;
}

export default function OnlineExamTakingPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();

  // Session State
  const [session, setSession] = useState<ExamSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Navigation State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> selectedChoiceId
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({}); // questionId -> boolean

  // Autosave State
  const [autosaveStatus, setAutosaveStatus] = useState<"SAVED" | "SAVING" | "ERROR">("SAVED");

  // Timer State
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [isTimeExpired, setIsTimeExpired] = useState(false);

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cheatWarning, setCheatWarning] = useState<string | null>(null);

  // Anti-Cheat: Track Blur/Tab-Switch
  const logCheatEvent = useCallback(
    async (eventType: string, details?: string) => {
      if (!session?.attemptId) return;
      try {
        await fetch(`/api/exam-taking/${session.attemptId}/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType, details }),
        });
      } catch (err) {
        console.error("Failed to log event", err);
      }
    },
    [session?.attemptId]
  );

  const initRef = useRef(false);

  // 1. Initialize Exam Session
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function initSession() {
      try {
        setLoading(true);
        const res = await fetch(`/api/exams/${params.id}/start`, {
          method: "POST",
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          if (data.alreadySubmitted) {
            router.replace(`/student/exams/${params.id}/result`);
            return;
          }
          setInitError(data.message || "ไม่สามารถเริ่มทำแบบทดสอบได้");
          setLoading(false);
          return;
        }

        setSession(data);

        // Prepopulate saved answers
        const initialAnswers: Record<string, string> = {};
        if (data.savedAnswers) {
          Object.entries(data.savedAnswers).forEach(([qId, ans]: [string, any]) => {
            if (ans.selectedChoiceId) {
              initialAnswers[qId] = ans.selectedChoiceId;
            }
          });
        }
        setAnswers(initialAnswers);

        // Compute remaining seconds from server timestamps
        const serverNow = new Date(data.serverTime).getTime();
        const deadline = new Date(data.deadlineAt).getTime();
        const diffSeconds = Math.max(0, Math.floor((deadline - serverNow) / 1000));
        setSecondsRemaining(diffSeconds);
      } catch {
        setInitError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [params.id]);

  // 2. Countdown Timer
  useEffect(() => {
    if (secondsRemaining === null || isTimeExpired) return;

    if (secondsRemaining <= 0) {
      setIsTimeExpired(true);
      handleAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setIsTimeExpired(true);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining, isTimeExpired]);

  // 3. Anti-Cheat Visibility Listeners
  useEffect(() => {
    if (!session?.attemptId) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logCheatEvent("TAB_SWITCH", "User switched tab or minimized browser window");
        setCheatWarning("ตรวจพบการสลับแท็บหรือหน้าต่างเบราว์เซอร์ ระบบได้บันทึกกิจกรรมนี้ไว้ในประวัติการสอบ");
      }
    };

    const handleWindowBlur = () => {
      logCheatEvent("WINDOW_BLUR", "Browser window lost focus");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [session?.attemptId, logCheatEvent]);

  // 4. Autosave Handler
  const handleSelectChoice = async (choiceId: string) => {
    if (!session) return;
    const currentQ = session.questions[currentIndex];
    if (!currentQ) return;

    // Update local state immediately
    const updatedAnswers = { ...answers, [currentQ.id]: choiceId };
    setAnswers(updatedAnswers);

    // Call Autosave API
    setAutosaveStatus("SAVING");
    try {
      const res = await fetch(`/api/exam-taking/${session.attemptId}/autosave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQ.id,
          selectedChoiceId: choiceId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAutosaveStatus("SAVED");
      } else {
        setAutosaveStatus("ERROR");
      }
    } catch {
      setAutosaveStatus("ERROR");
    }
  };

  const handleToggleFlag = () => {
    if (!session) return;
    const currentQ = session.questions[currentIndex];
    if (!currentQ) return;
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };

  // 5. Submit Handlers
  const handleSubmitExam = async (isAuto = false) => {
    if (!session || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/exam-taking/${session.attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoSubmit: isAuto }),
      });
      const data = await res.json();

      if (data.success) {
        router.replace(`/student/exams/${params.id}/result`);
        router.refresh();
      } else {
        alert(data.message || "เกิดข้อผิดพลาดในการส่งแบบทดสอบ กรุณาลองใหม่อีกครั้ง");
        setSubmitting(false);
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการส่งแบบทดสอบ กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    handleSubmitExam(true);
  };

  // Format Timer mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <p className="text-sm font-semibold text-slate-700">กำลังเข้าสู่ระบบการสอบออนไลน์...</p>
        <p className="text-xs text-slate-400">ระบบกำลังจัดเตรียมข้อสอบและตัวจับเวลา</p>
      </div>
    );
  }

  if (initError || !session) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-rose-200 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">ไม่สามารถเข้าสอบได้</h2>
        <p className="text-xs text-slate-500">{initError}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <Link
            href={`/student/exams/${params.id}/result`}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition"
          >
            ดูผลการสอบ
          </Link>
          <Link
            href={`/student/exams/${params.id}`}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition"
          >
            หน้ารายละเอียดแบบทดสอบ
          </Link>
        </div>
      </div>
    );
  }

  const currentQ = session.questions[currentIndex];
  const totalQuestions = session.questions.length;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-12">
      {/* Top Floating Exam Navbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-4 sticky top-16 z-20 backdrop-blur-md bg-white/95">
        <div>
          <div className="text-[11px] font-bold text-emerald-700 font-mono">
            {session.courseCode} - {session.examTitle}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            ข้อที่ {currentIndex + 1} จาก {totalQuestions} ข้อ
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Autosave Status */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            {autosaveStatus === "SAVING" ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                <span className="text-emerald-600">กำลังบันทึก...</span>
              </>
            ) : autosaveStatus === "SAVED" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>บันทึกแล้ว</span>
              </>
            ) : (
              <span className="text-rose-500">บันทึกไม่สำเร็จ</span>
            )}
          </div>

          {/* Synchronized Timer */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono font-bold text-sm transition ${
              secondsRemaining !== null && secondsRemaining < 300
                ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                : "bg-slate-100 text-slate-800"
            }`}
          >
            <Clock className="w-4 h-4 text-slate-500" />
            <span>{secondsRemaining !== null ? formatTime(secondsRemaining) : "--:--"}</span>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> ส่งข้อสอบ
          </button>
        </div>
      </div>

      {cheatWarning && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{cheatWarning}</span>
          </div>
          <button
            onClick={() => setCheatWarning(null)}
            className="text-xs font-bold text-amber-800 hover:underline ml-2"
          >
            รับทราบ
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Pane (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            {/* Question Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center font-mono">
                  {currentIndex + 1}
                </span>
                <DifficultyBadge difficulty={currentQ.difficulty} />
                <QuestionTypeBadge type={currentQ.questionType} />
                {currentQ.categoryName && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {currentQ.categoryName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg font-mono">
                  {currentQ.score} คะแนน
                </span>
                <button
                  onClick={handleToggleFlag}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                    flaggedQuestions[currentQ.id]
                      ? "bg-amber-50 border-amber-300 text-amber-700"
                      : "border-slate-200 text-slate-400 hover:bg-slate-50"
                  }`}
                  title="ปักหมุดเพื่อกลับมาทบทวน"
                >
                  <Flag className={`w-3.5 h-3.5 ${flaggedQuestions[currentQ.id] ? "fill-amber-500 text-amber-500" : ""}`} />
                  <span className="hidden sm:inline">
                    {flaggedQuestions[currentQ.id] ? "ปักหมุดแล้ว" : "ปักหมุดทบทวน"}
                  </span>
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div className="text-base font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
              {currentQ.questionText}
            </div>

            {/* Choices Options List */}
            <div className="space-y-3 pt-2">
              {currentQ.choices.map((choice, idx) => {
                const isSelected = answers[currentQ.id] === choice.id;
                return (
                  <label
                    key={choice.id}
                    onClick={() => handleSelectChoice(choice.id)}
                    className={`p-4 rounded-xl border flex items-start gap-3.5 cursor-pointer transition ${
                      isSelected
                        ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500 text-emerald-950 font-semibold"
                        : "bg-slate-50/50 border-slate-200 text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question_${currentQ.id}`}
                      checked={isSelected}
                      onChange={() => handleSelectChoice(choice.id)}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                    />
                    <div className="flex items-center gap-2.5 flex-1">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          isSelected ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-sm leading-snug">{choice.choiceText}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
            </button>

            <span className="text-xs text-slate-400 font-medium">
              ข้อ {currentIndex + 1} จาก {totalQuestions}
            </span>

            {currentIndex < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm"
              >
                ถัดไป <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-emerald-600/20"
              >
                <Send className="w-3.5 h-3.5" /> ตรวจทานและส่งข้อสอบ
              </button>
            )}
          </div>
        </div>

        {/* Question Grid Navigator (1 Col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" /> นำทางข้อสอบ (Navigator)
              </h3>
              <span className="text-[11px] font-bold text-emerald-700">
                {answeredCount}/{totalQuestions} ตอบแล้ว
              </span>
            </div>

            {/* Question Navigator Grid */}
            <div className="grid grid-cols-5 gap-2">
              {session.questions.map((q, idx) => {
                const isAnswered = Boolean(answers[q.id]);
                const isFlagged = Boolean(flaggedQuestions[q.id]);
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl text-xs font-bold font-mono transition relative flex items-center justify-center ${
                      isCurrent
                        ? "ring-2 ring-indigo-600 ring-offset-2 z-10"
                        : ""
                    } ${
                      isAnswered
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Grid Legend */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-emerald-600" />
                <span>ตอบแล้ว ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-300" />
                <span>ยังไม่ได้ตอบ ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span>ปักหมุดทบทวน ({Object.values(flaggedQuestions).filter(Boolean).length})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="ยืนยันการส่งแบบทดสอบ"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="font-bold text-sm text-slate-900">สรุปความคืบหน้าการทำข้อสอบ:</div>
            <div className="grid grid-cols-2 gap-2 pt-1 font-semibold">
              <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-800 border border-emerald-200">
                ตอบแล้ว: {answeredCount} ข้อ
              </div>
              <div className="p-2.5 bg-rose-50 rounded-lg text-rose-800 border border-rose-200">
                ยังไม่ได้ตอบ: {unansweredCount} ข้อ
              </div>
            </div>
            {unansweredCount > 0 && (
              <p className="text-rose-600 text-[11px] pt-1">
                คำเตือน: คุณยังมีข้อสอบที่ยังไม่ได้ตอบ {unansweredCount} ข้อ
              </p>
            )}
          </div>

          <p className="text-xs text-slate-500">
            เมื่อกดส่งแบบทดสอบแล้ว คุณจะไม่สามารถกลับมาแก้ไขคำตอบได้อีก ต้องการส่งแบบทดสอบทันทีหรือไม่?
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              กลับไปทำข้อสอบต่อ
            </button>
            <button
              onClick={() => handleSubmitExam(false)}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังส่งแบบทดสอบ...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  ยืนยันส่งแบบทดสอบ
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
