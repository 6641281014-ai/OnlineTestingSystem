"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BarChart3,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users,
  Award,
  Layers,
  FileSpreadsheet,
  TrendingUp,
  Percent,
  Sparkles,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { DifficultyBadge, QuestionTypeBadge } from "@/components/ui/Badge";
import { DescriptiveStats, ItemAnalysisResult } from "@/lib/analytics";

interface ExamInfo {
  id: string;
  title: string;
  examType: string;
  totalScore: number;
  passingScore: number;
  course: { id: string; code: string; title: string };
}

interface DistributionItem {
  range: string;
  count: number;
}

export default function TeacherExamAnalyticsPage({
  params,
}: {
  params: { id: string; examId: string };
}) {
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [stats, setStats] = useState<DescriptiveStats | null>(null);
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [itemAnalysis, setItemAnalysis] = useState<ItemAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/exams/${params.examId}/analytics`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "ไม่สามารถโหลดข้อมูลการวิเคราะห์ได้");
        return;
      }
      setExam(data.exam);
      setStats(data.stats);
      setDistribution(data.distribution);
      setItemAnalysis(data.itemAnalysis);
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  }, [params.examId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-slate-700">กำลังประมวลผลสถิติและวิเคราะห์คุณภาพข้อสอบ...</p>
      </div>
    );
  }

  if (error || !exam || !stats) {
    return (
      <div className="space-y-4">
        <Link
          href={`/instructor/courses/${params.id}/exams/${params.examId}/results`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังผลการสอบ
        </Link>
        <Alert type="error" message={error || "ไม่พบข้อมูลสถิติ"} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link href="/instructor/dashboard" className="hover:text-indigo-600 transition">
          แดชบอร์ด
        </Link>
        <span>/</span>
        <Link href="/instructor/courses" className="hover:text-indigo-600 transition">
          รายวิชาที่รับผิดชอบ
        </Link>
        <span>/</span>
        <Link href={`/instructor/courses/${params.id}`} className="hover:text-indigo-600 transition">
          {exam.course.code}
        </Link>
        <span>/</span>
        <Link href={`/instructor/courses/${params.id}/assessments`} className="hover:text-indigo-600 transition">
          ชุดข้อสอบและแบบทดสอบ
        </Link>
        <span>/</span>
        <Link href={`/instructor/courses/${params.id}/exams/${params.examId}/results`} className="hover:text-indigo-600 transition">
          {exam.title}
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">วิเคราะห์ข้อสอบ (Analytics)</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-mono">
                {exam.course.code}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                {exam.examType}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              สถิติและผลการวิเคราะห์คุณภาพข้อสอบ (Item Analytics)
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm">
              {exam.title} • ค่าความยากง่าย (p), ค่าอำนาจจำแนก (r) และการกระจายตัวของคะแนนสอบ
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href={`/instructor/courses/${params.id}/exams/${params.examId}/results`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition"
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>ดูรายชื่อคะแนนนักศึกษา</span>
            </Link>
            <Link
              href={`/instructor/courses/${params.id}/exams/${params.examId}`}
              className="px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition"
            >
              จัดการข้อสอบในชุด
            </Link>
          </div>
        </div>
      </div>

      {/* Overview Descriptive Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-[11px] font-medium text-slate-400">ผู้เข้าสอบ (N)</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{stats.count} คน</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-[11px] font-medium text-slate-400">คะแนนเฉลี่ย (x̄)</span>
          <p className="text-xl font-bold text-indigo-600 mt-1">{stats.mean}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-[11px] font-medium text-slate-400">คะแนนสูงสุด (Max)</span>
          <p className="text-xl font-bold text-emerald-600 mt-1">{stats.max}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-[11px] font-medium text-slate-400">คะแนนต่ำสุด (Min)</span>
          <p className="text-xl font-bold text-rose-600 mt-1">{stats.min}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-[11px] font-medium text-slate-400">ส่วนเบี่ยงเบน (SD)</span>
          <p className="text-xl font-bold text-slate-800 mt-1">{stats.sd}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-[11px] font-medium text-slate-400">ผ่านเกณฑ์</span>
          <p className="text-xl font-bold text-teal-600 mt-1">{stats.passedCount} คน</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-[11px] font-medium text-slate-400">อัตราการผ่าน</span>
          <p className="text-xl font-bold text-indigo-600 mt-1">{stats.passRate}%</p>
        </div>
      </div>

      {/* Score Frequency Distribution */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">การกระจายตัวของคะแนน (Score Distribution)</h2>
            <p className="text-xs text-slate-500 mt-0.5">ช่วงคะแนนร้อยละของผู้เข้าสอบ</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            เกณฑ์ผ่าน {exam.passingScore} คะแนน
          </span>
        </div>

        <div className="grid grid-cols-5 gap-3 pt-2">
          {distribution.map((dist) => {
            const pct = stats.count > 0 ? (dist.count / stats.count) * 100 : 0;
            return (
              <div key={dist.range} className="p-3 bg-slate-50 rounded-xl text-center space-y-2">
                <span className="text-[11px] font-bold text-slate-500">{dist.range}</span>
                <div className="h-16 bg-slate-200 rounded-lg flex items-end justify-center overflow-hidden p-1">
                  <div
                    style={{ height: `${Math.max(10, pct)}%` }}
                    className="w-full bg-indigo-600 rounded-md transition-all duration-500"
                  />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {dist.count} คน ({pct.toFixed(0)}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Item Analysis Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              การวิเคราะห์คุณภาพข้อสอบรายข้อ (Item Analysis)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ดัชนีความยากง่าย (Difficulty: p) และดัชนีอำนาจจำแนก (Discrimination: r)
            </p>
          </div>
          <div className="text-[11px] text-slate-400">
            เกณฑ์คุณภาพ: p (0.20-0.80) • r (≥ 0.20)
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
              {itemAnalysis.map((item, idx) => (
                <tr key={item.questionId} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4 font-bold font-mono text-slate-900 text-center">
                    {idx + 1}
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="font-semibold text-slate-900 line-clamp-2 text-xs">
                      {item.questionText}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <DifficultyBadge difficulty={item.difficultyLevel} />
                      <QuestionTypeBadge type={item.questionType} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-700 font-mono text-xs">
                    {item.correctCount} / {item.totalExaminees}
                  </td>
                  <td className="px-6 py-4 text-center font-mono">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                        item.difficultyQuality === "MODERATE"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.difficultyQuality === "EASY" || item.difficultyQuality === "HARD"
                          ? "bg-blue-50 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.difficultyIndex}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      {item.difficultyText}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-mono">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                        item.discriminationQuality === "VERY_GOOD" || item.discriminationQuality === "GOOD"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.discriminationQuality === "FAIR"
                          ? "bg-blue-50 text-blue-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {item.discriminationIndex}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      {item.discriminationText}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
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
                        : "✗ ควรตัดออก/แก้ไขใหม่"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
