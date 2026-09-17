"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ArrowLeft,
  Loader2,
  Award,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  HelpCircle,
  BarChart3,
  Percent,
  AlertCircle,
  Plus,
  ArrowRight,
  Info,
  Download,
  FileText,
  Activity,
  Calculator,
  Compass,
  FileCheck,
  Search,
  ChevronRight,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { DifficultyBadge, QuestionTypeBadge } from "@/components/ui/Badge";
import {
  PrePostClassAnalytics,
  StudentGainResult,
  ItemAnalysisResult,
  PairedTTestResult,
} from "@/lib/analytics";

interface CourseInfo {
  id: string;
  code: string;
  title: string;
  instructorName?: string;
  enrollmentsCount?: number;
}

interface ExamItem {
  id: string;
  title: string;
  examType: string;
  totalScore: number;
  passingScore: number;
  isPublished: boolean;
  questionsCount: number;
  submittedAttemptsCount: number;
}

interface SelectedExamInfo {
  id: string;
  title: string;
  examType: string;
  totalScore: number;
  submittedCount: number;
}

interface UnmatchedSummary {
  preOnlyCount: number;
  postOnlyCount: number;
  preOnlyStudents: Array<{ id: string; name: string; code: string; score: number; percent: number }>;
  postOnlyStudents: Array<{ id: string; name: string; code: string; score: number; percent: number }>;
}

export default function CourseResearchDashboardPage({
  params,
}: {
  params: { id: string };
}) {
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [allExams, setAllExams] = useState<ExamItem[]>([]);
  const [hasExams, setHasExams] = useState<boolean>(true);
  const [hasComparisonPair, setHasComparisonPair] = useState<boolean>(true);
  const [singleExam, setSingleExam] = useState<ExamItem | null>(null);
  const [preExam, setPreExam] = useState<SelectedExamInfo | null>(null);
  const [postExam, setPostExam] = useState<SelectedExamInfo | null>(null);
  const [analytics, setAnalytics] = useState<PrePostClassAnalytics | null>(null);
  const [postItemAnalysis, setPostItemAnalysis] = useState<ItemAnalysisResult[] | null>(null);
  const [unmatchedSummary, setUnmatchedSummary] = useState<UnmatchedSummary | null>(null);

  const [selectedPreId, setSelectedPreId] = useState<string>("");
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter for Individual Gains table
  const [searchTerm, setSearchTerm] = useState("");
  const [gainFilter, setGainFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");

  const fetchAnalytics = useCallback(async (preId?: string, postId?: string) => {
    try {
      setLoading(true);
      let url = `/api/courses/${params.id}/pre-post-analytics`;
      const qParams = [];
      if (preId) qParams.push(`preId=${preId}`);
      if (postId) qParams.push(`postId=${postId}`);
      if (qParams.length > 0) url += `?${qParams.join("&")}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "ไม่สามารถโหลดข้อมูลการประเมินผลสัมฤทธิ์ได้");
        return;
      }

      setCourse(data.course);
      setHasExams(data.hasExams);
      setHasComparisonPair(data.hasComparisonPair);
      setAllExams(data.allExams || []);

      if (data.singleExam) {
        setSingleExam(data.singleExam);
      }

      if (data.hasComparisonPair) {
        setPreExam(data.preExam);
        setPostExam(data.postExam);
        setAnalytics(data.analytics);
        setPostItemAnalysis(data.postItemAnalysis || null);
        setUnmatchedSummary(data.unmatchedSummary || null);
        setSelectedPreId(data.preExam.id);
        setSelectedPostId(data.postExam.id);
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleSelectExamChange = (preId: string, postId: string) => {
    setSelectedPreId(preId);
    setSelectedPostId(postId);
    fetchAnalytics(preId, postId);
  };

  const handleExport = (format: "csv" | "excel") => {
    const qParams = [`format=${format}`];
    if (selectedPreId) qParams.push(`preId=${selectedPreId}`);
    if (selectedPostId) qParams.push(`postId=${selectedPostId}`);
    window.location.href = `/api/courses/${params.id}/export?${qParams.join("&")}`;
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-slate-700">กำลังประมวลผลสถิติและแบบจำลองวิจัย (Research Analytics)...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="space-y-4">
        <Link
          href={`/instructor/courses/${params.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังรายวิชา
        </Link>
        <Alert type="error" message={error || "ไม่พบข้อมูลรายวิชา"} />
      </div>
    );
  }

  // Case 1: No exams exist in course
  if (!hasExams || allExams.length === 0) {
    return (
      <div className="space-y-4">
        <Link
          href={`/instructor/courses/${params.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังรายวิชา
        </Link>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">ยังไม่มีชุดแบบทดสอบในรายวิชา</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            เพื่อวิเคราะห์ผลสัมฤทธิ์ทางการเรียน กรุณาสร้างแบบทดสอบก่อนเรียน (Pre-test) และแบบทดสอบหลังเรียน (Post-test)
          </p>
          <Link
            href={`/instructor/courses/${params.id}/exams/create`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" /> สร้างชุดแบบทดสอบ
          </Link>
        </div>
      </div>
    );
  }

  // Case 2: Only 1 exam exists in course
  if (!hasComparisonPair || allExams.length === 1) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href={`/instructor/courses/${params.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium mb-3 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังรายวิชา
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-mono">
                  {course.code}
                </span>
                <span className="text-xs text-slate-500 font-medium">การประเมินผลสัมฤทธิ์ทางการเรียน</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                แดชบอร์ดการวิจัยผลสัมฤทธิ์ทางการเรียน (Research Dashboard)
              </h1>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
            <Info className="w-4 h-4 text-amber-600" />
            รายวิชานี้มีแบบทดสอบ 1 ชุด: &ldquo;{singleExam?.title}&rdquo;
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            การคำนวณดัชนีพัฒนาการสัมพัทธ์ (Normalized Gain: &lt;g&gt;) และสถิติทดสอบ Dependent Samples t-test ต้องเปรียบเทียบผลการสอบระหว่าง 2 ชุด (เช่น แบบทดสอบก่อนเรียน <b>PRE_TEST</b> และแบบทดสอบหลังเรียน <b>POST_TEST</b>) กรุณาสร้างชุดแบบทดสอบเพิ่มอีกอย่างน้อย 1 ชุด
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Link
              href={`/instructor/courses/${params.id}/exams/create`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" /> + สร้างแบบทดสอบหลังเรียน (Post-test)
            </Link>
            {singleExam && (
              <Link
                href={`/instructor/courses/${params.id}/exams/${singleExam.id}/results`}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
              >
                ดูผลคะแนนชุดปัจจุบัน ({singleExam.submittedAttemptsCount} คน)
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Filter individual gains
  const filteredGains = analytics?.studentGains.filter((s) => {
    const matchSearch =
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGain =
      gainFilter === "ALL" ? true : s.gainLevel === gainFilter;
    return matchSearch && matchGain;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header & Quick Navigation */}
      <div>
        <Link
          href={`/instructor/courses/${params.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium mb-3 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังภาพรวมรายวิชา
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-mono">
                {course.code}
              </span>
              <span className="text-xs text-slate-500 font-medium">Research & Statistical Evaluation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              แดชบอร์ดการวิจัยผลสัมฤทธิ์ทางการเรียน (Research Dashboard)
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              การวิเคราะห์คะแนนก่อน/หลังเรียน, การทดสอบสมมติฐานทางสถิติ (Paired t-test), ขนาดอิทธิพล (Cohen&apos;s d) และ Normalized Gain
            </p>
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/instructor/courses/${params.id}/progress`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition"
            >
              <Users className="w-3.5 h-3.5" /> ติดตามความก้าวหน้ารายบุคคล
            </Link>

            <Link
              href={`/instructor/courses/${params.id}/research-report`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs transition"
            >
              <FileText className="w-3.5 h-3.5" /> ตัวอย่างรายงานวิจัย (Chapter 4)
            </Link>

            <button
              onClick={() => handleExport("csv")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" /> ส่งออก CSV
            </button>

            <button
              onClick={() => handleExport("excel")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> ส่งออก Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* Select Pre/Post Pair Dropdown */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span>เลือกชุดแบบทดสอบเปรียบเทียบผลสัมฤทธิ์:</span>
          <span className="text-[11px] text-slate-400 font-normal">
            นักศึกษาในวิชา: {course.enrollmentsCount || 0} คน
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              ชุดแบบทดสอบก่อนเรียน (Pre-test / Exam A):
            </label>
            <select
              value={selectedPreId}
              onChange={(e) => handleSelectExamChange(e.target.value, selectedPostId)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {allExams.map((e) => (
                <option key={e.id} value={e.id}>
                  [{e.examType}] {e.title} ({e.submittedAttemptsCount} ผู้ส่งสอบ)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              ชุดแบบทดสอบหลังเรียน (Post-test / Exam B):
            </label>
            <select
              value={selectedPostId}
              onChange={(e) => handleSelectExamChange(selectedPreId, e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {allExams.map((e) => (
                <option key={e.id} value={e.id}>
                  [{e.examType}] {e.title} ({e.submittedAttemptsCount} ผู้ส่งสอบ)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* When no students have completed both sets */}
      {analytics && analytics.totalMatchedStudents === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            ยังไม่มีนักศึกษาที่ทำแบบทดสอบครบทั้งสองชุด
          </h2>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            แบบทดสอบ <b>{preExam?.title}</b> มีผู้ส่งสอบแล้ว {preExam?.submittedCount} คน และแบบทดสอบ{" "}
            <b>{postExam?.title}</b> มีผู้ส่งสอบแล้ว {postExam?.submittedCount} คน แต่ยังไม่มีนักศึกษาคนใดที่สอบครบทั้ง 2 ชุดเพื่อนำคะแนนมาจับคู่คำนวณพัฒนาการ
          </p>

          {unmatchedSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto pt-2 text-left">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  ทำเฉพาะชุดแรก ({unmatchedSummary.preOnlyCount} คน):
                </span>
                {unmatchedSummary.preOnlyStudents.length === 0 ? (
                  <span className="text-xs text-slate-400">ไม่มี</span>
                ) : (
                  <div className="space-y-1">
                    {unmatchedSummary.preOnlyStudents.map((s) => (
                      <div key={s.id} className="text-xs text-slate-700 flex justify-between">
                        <span>{s.name}</span>
                        <span className="font-mono font-bold text-indigo-600">{s.percent}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  ทำเฉพาะชุดหลัง ({unmatchedSummary.postOnlyCount} คน):
                </span>
                {unmatchedSummary.postOnlyStudents.length === 0 ? (
                  <span className="text-xs text-slate-400">ไม่มี</span>
                ) : (
                  <div className="space-y-1">
                    {unmatchedSummary.postOnlyStudents.map((s) => (
                      <div key={s.id} className="text-xs text-slate-700 flex justify-between">
                        <span>{s.name}</span>
                        <span className="font-mono font-bold text-indigo-600">{s.percent}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : analytics && analytics.totalMatchedStudents > 0 ? (
        <>
          {/* SECTION A & B: Main Highlights & Gain Banner */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold text-indigo-300 tracking-wider">
                  ดัชนีพัฒนาการสัมพัทธ์ของชั้นเรียน (Class Hake&apos;s Gain)
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-5xl sm:text-6xl font-extrabold font-mono text-emerald-400">
                    {analytics.hakeClassGain.toFixed(3)}
                  </span>
                  <span className="text-base sm:text-lg text-indigo-200 font-semibold">
                    ({analytics.hakeClassGainLevelText})
                  </span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-xs space-y-1.5 min-w-[200px]">
                <div className="text-indigo-200 font-semibold">สูตรการคำนวณ Hake&apos;s Gain:</div>
                <div className="font-mono text-sm text-emerald-300 font-bold">
                  &lt;g&gt; = (%Post - %Pre) / (100 - %Pre)
                </div>
                <div className="text-[11px] text-white/70">
                  เกณฑ์: &ge;0.70 (สูง) | 0.30-0.69 (ปานกลาง) | &lt;0.30 (ต่ำ)
                </div>
              </div>
            </div>

            {/* Metrics Grid inside Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/15">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl">
                <span className="text-xs text-indigo-200">คะแนนเฉลี่ยก่อนเรียน</span>
                <p className="text-2xl font-bold font-mono text-white mt-1">
                  {analytics.avgPrePercent.toFixed(1)}%
                </p>
                <span className="text-[11px] text-white/70 font-mono">SD = {analytics.sdPrePercent.toFixed(2)}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl">
                <span className="text-xs text-indigo-200">คะแนนเฉลี่ยหลังเรียน</span>
                <p className="text-2xl font-bold font-mono text-emerald-300 mt-1">
                  {analytics.avgPostPercent.toFixed(1)}%
                </p>
                <span className="text-[11px] text-white/70 font-mono">SD = {analytics.sdPostPercent.toFixed(2)}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl">
                <span className="text-xs text-indigo-200">ผลต่างคะแนนเฉลี่ย</span>
                <p className="text-2xl font-bold font-mono text-white mt-1">
                  {analytics.meanDifference >= 0 ? `+${analytics.meanDifference.toFixed(1)}%` : `${analytics.meanDifference.toFixed(1)}%`}
                </p>
                <span className="text-[11px] text-emerald-300 font-mono">+{analytics.classPercentageImprovement.toFixed(1)}% Improvement</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl">
                <span className="text-xs text-indigo-200">กลุ่มตัวอย่างที่สมบูรณ์ (N)</span>
                <p className="text-2xl font-bold font-mono text-white mt-1">
                  {analytics.totalMatchedStudents} คน
                </p>
                <span className="text-[11px] text-white/70">อัตราการผ่าน {analytics.passRate}%</span>
              </div>
            </div>
          </div>

          {/* SECTION C & D: Statistical Hypothesis Testing (Paired t-test & Cohen's d) */}
          {analytics.tTest && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-indigo-600" />
                    การทดสอบสมมติฐานทางสถิติ (Dependent Samples t-test & Effect Size)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ระดับนัยสำคัญทางสถิติกำหนดที่ &alpha; = 0.05
                  </p>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                      analytics.tTest.isSignificant
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {analytics.tTest.isSignificant ? "✓ มีนัยสำคัญทางสถิติ (p < .05)" : "✗ ไม่มีนัยสำคัญทางสถิติ"}
                  </span>
                </div>
              </div>

              {/* 5 t-test stats columns */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl text-center border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-400">ค่าสถิติ t (t-value)</span>
                  <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">{analytics.tTest.tValue.toFixed(3)}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl text-center border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-400">องศาอิสระ (df)</span>
                  <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">{analytics.tTest.df}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl text-center border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-400">ค่าความน่าจะเป็น (p-value)</span>
                  <p className="text-xl font-bold font-mono text-indigo-600 mt-0.5">{analytics.tTest.pValueFormatted}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl text-center border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-400">ส่วนเบี่ยงเบนของผลต่าง (SD diff)</span>
                  <p className="text-xl font-bold font-mono text-slate-800 mt-0.5">{analytics.tTest.sdDiff.toFixed(2)}</p>
                </div>
                <div className="p-3.5 bg-indigo-50/50 rounded-xl text-center border border-indigo-100">
                  <span className="text-[11px] font-bold text-indigo-700">ขนาดอิทธิพล (Cohen&apos;s d)</span>
                  <p className="text-xl font-bold font-mono text-indigo-700 mt-0.5">{analytics.tTest.cohensD}</p>
                  <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">{analytics.tTest.effectSizeLevel}</span>
                </div>
              </div>

              {/* Dynamic Narrative Summary Box */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 text-xs text-slate-700 space-y-1.5">
                <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  ข้อความสรุปผลวิจัยทางสถิติ (Academic Findings Synthesis):
                </div>
                <p className="leading-relaxed text-slate-800">
                  {analytics.tTest.academicSummaryText}
                </p>
              </div>
            </div>
          )}

          {/* SECTION E: Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Pre vs Post Mean Comparison */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">เปรียบเทียบคะแนนเฉลี่ย (Pre vs Post Mean %)</h3>
                  <p className="text-[11px] text-slate-400">คะแนนเฉลี่ยร้อยละก่อนเรียนเทียบกับหลังเรียน</p>
                </div>
                <span className="text-xs font-bold text-emerald-600">
                  +{analytics.meanDifference >= 0 ? analytics.meanDifference.toFixed(1) : analytics.meanDifference.toFixed(1)}%
                </span>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600">ก่อนเรียน (Pre-test)</span>
                    <span className="font-mono text-slate-800">{analytics.avgPrePercent.toFixed(1)}% (SD = {analytics.sdPrePercent.toFixed(2)})</span>
                  </div>
                  <div className="h-6 bg-slate-100 rounded-xl overflow-hidden p-0.5">
                    <div
                      style={{ width: `${Math.min(100, Math.max(5, analytics.avgPrePercent))}%` }}
                      className="h-full bg-slate-500 rounded-lg transition-all duration-500 flex items-center justify-end pr-2 text-[10px] text-white font-bold"
                    >
                      {analytics.avgPrePercent > 15 ? `${analytics.avgPrePercent.toFixed(1)}%` : ""}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-indigo-900">หลังเรียน (Post-test)</span>
                    <span className="font-mono text-emerald-700 font-bold">{analytics.avgPostPercent.toFixed(1)}% (SD = {analytics.sdPostPercent.toFixed(2)})</span>
                  </div>
                  <div className="h-6 bg-slate-100 rounded-xl overflow-hidden p-0.5">
                    <div
                      style={{ width: `${Math.min(100, Math.max(5, analytics.avgPostPercent))}%` }}
                      className="h-full bg-emerald-600 rounded-lg transition-all duration-500 flex items-center justify-end pr-2 text-[10px] text-white font-bold"
                    >
                      {analytics.avgPostPercent > 15 ? `${analytics.avgPostPercent.toFixed(1)}%` : ""}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 2: Gain Level Distribution */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">การแจกแจงระดับพัฒนาการ (Gain Distribution)</h3>
                  <p className="text-[11px] text-slate-400">จำแนกตามเกณฑ์ของ Hake (High, Medium, Low)</p>
                </div>
                <span className="text-xs font-bold text-indigo-700">N = {analytics.totalMatchedStudents}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-100 text-center">
                  <span className="text-[11px] font-bold text-emerald-800">ระดับสูง (&ge; 0.70)</span>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{analytics.highGainCount} คน</p>
                  <span className="text-[10px] text-slate-500">
                    {analytics.totalMatchedStudents > 0
                      ? ((analytics.highGainCount / analytics.totalMatchedStudents) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>

                <div className="p-3.5 bg-blue-50/40 rounded-2xl border border-blue-100 text-center">
                  <span className="text-[11px] font-bold text-blue-800">ระดับปานกลาง (0.30 - 0.69)</span>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{analytics.mediumGainCount} คน</p>
                  <span className="text-[10px] text-slate-500">
                    {analytics.totalMatchedStudents > 0
                      ? ((analytics.mediumGainCount / analytics.totalMatchedStudents) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>

                <div className="p-3.5 bg-rose-50/40 rounded-2xl border border-rose-100 text-center">
                  <span className="text-[11px] font-bold text-rose-800">ระดับต่ำ (&lt; 0.30)</span>
                  <p className="text-2xl font-bold text-rose-700 mt-1">{analytics.lowGainCount} คน</p>
                  <span className="text-[10px] text-slate-500">
                    {analytics.totalMatchedStudents > 0
                      ? ((analytics.lowGainCount / analytics.totalMatchedStudents) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION F: Individual Progress Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">ตารางข้อมูลงานวิจัยรายบุคคล (Individual Research Matrix)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  แสดงคะแนน, ผลต่าง, พัฒนาการร้อยละ, และ Normalized Gain ({filteredGains.length} คน)
                </p>
              </div>

              {/* Search & Gain Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ค้นหาชื่อ, รหัส..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <select
                  value={gainFilter}
                  onChange={(e) => setGainFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                >
                  <option value="ALL">ทุกระดับพัฒนาการ</option>
                  <option value="HIGH">ระดับสูง (&ge; 0.70)</option>
                  <option value="MEDIUM">ระดับปานกลาง (0.30 - 0.69)</option>
                  <option value="LOW">ระดับต่ำ (&lt; 0.30)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">นักศึกษา</th>
                    <th className="px-6 py-3.5 text-center">Pre-test (%)</th>
                    <th className="px-6 py-3.5 text-center">Post-test (%)</th>
                    <th className="px-6 py-3.5 text-center">ผลต่างคะแนน</th>
                    <th className="px-6 py-3.5 text-center">พัฒนาการร้อยละ</th>
                    <th className="px-6 py-3.5 text-center">Normalized Gain &lt;g&gt;</th>
                    <th className="px-6 py-3.5">ระดับพัฒนาการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredGains.map((s) => (
                    <tr key={s.studentId} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{s.studentName}</div>
                        <div className="text-xs text-slate-400 font-mono">{s.studentCode}</div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-700">
                        {s.preTestPercent.toFixed(1)}%
                        <span className="block text-[10px] text-slate-400 font-normal">
                          ({s.preTestScore}/{s.preTestTotal})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-emerald-700">
                        {s.postTestPercent.toFixed(1)}%
                        <span className="block text-[10px] text-slate-400 font-normal">
                          ({s.postTestScore}/{s.postTestTotal})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs ${
                            s.scoreDifference >= 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                          }`}
                        >
                          {s.scoreDifference >= 0 ? `+${s.scoreDifference.toFixed(1)}%` : `${s.scoreDifference.toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-xs text-indigo-700">
                        {s.percentageImprovement >= 0 ? `+${s.percentageImprovement.toFixed(1)}%` : `${s.percentageImprovement.toFixed(1)}%`}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-extrabold text-sm text-indigo-700">
                        {s.gain.toFixed(3)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            s.gainLevel === "HIGH"
                              ? "bg-emerald-100 text-emerald-800"
                              : s.gainLevel === "MEDIUM"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {s.gainLevel === "HIGH"
                            ? "✓ ระดับสูง"
                            : s.gainLevel === "MEDIUM"
                            ? "• ระดับปานกลาง"
                            : "✗ ระดับต่ำ"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION G: Item Analysis Summary */}
          {postItemAnalysis && postItemAnalysis.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    สรุปการวิเคราะห์คุณภาพข้อสอบ (Item Analysis Summary)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ค่าความยากง่าย (p) และค่าอำนาจจำแนก (r) ของชุดแบบทดสอบหลังเรียน ({postItemAnalysis.length} ข้อ)
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5">ข้อที่</th>
                      <th className="px-6 py-3.5">คำถาม</th>
                      <th className="px-6 py-3.5 text-center">ตอบถูก</th>
                      <th className="px-6 py-3.5 text-center">ความยากง่าย (p)</th>
                      <th className="px-6 py-3.5 text-center">อำนาจจำแนก (r)</th>
                      <th className="px-6 py-3.5">การแปลผลคุณภาพ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {postItemAnalysis.map((item, idx) => (
                      <tr key={item.questionId} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4 font-bold font-mono text-slate-900 text-center">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="font-semibold text-slate-900 line-clamp-2 text-xs">
                            {item.questionText}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700 font-mono text-xs">
                          {item.correctCount} / {item.totalExaminees}
                        </td>
                        <td className="px-6 py-4 text-center font-mono">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800">
                            {item.difficultyIndex}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{item.difficultyText}</span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-800">
                            {item.discriminationIndex}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{item.discriminationText}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              item.discriminationQuality === "VERY_GOOD" || item.discriminationQuality === "GOOD"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.discriminationQuality === "FAIR"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {item.discriminationQuality === "VERY_GOOD" || item.discriminationQuality === "GOOD"
                              ? "✓ ข้อสอบคุณภาพดี"
                              : item.discriminationQuality === "FAIR"
                              ? "⚠ ควรปรับปรุงตัวเลือก"
                              : "✗ ควรปรับปรุงข้อสอบ"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
