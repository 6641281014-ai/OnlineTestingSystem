"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Users,
  Award,
  Loader2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";

interface StudentResult {
  attemptId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  studentEmail: string;
  attemptNumber: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  isPassed: boolean;
  status: string;
  startedAt: string;
  submittedAt?: string | null;
  timeSpentSeconds: number;
  answeredCount: number;
  logEventsCount: number;
}

interface ExamInfo {
  id: string;
  title: string;
  examType: string;
  totalScore: number;
  passingScore: number;
  course: { id: string; code: string; title: string };
}

export default function TeacherExamResultsPage({
  params,
}: {
  params: { id: string; examId: string };
}) {
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PASSED" | "FAILED">("ALL");
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/exams/${params.examId}/results`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "ไม่สามารถโหลดข้อมูลผลการสอบได้");
        return;
      }
      setExam(data.exam);
      setResults(data.results);
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  }, [params.examId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} นาที ${secs} วินาที`;
  };

  const filteredResults = results.filter((r) => {
    const matchSearch =
      r.studentName.toLowerCase().includes(search.toLowerCase()) ||
      r.studentCode.toLowerCase().includes(search.toLowerCase()) ||
      r.studentEmail.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      filterStatus === "ALL"
        ? true
        : filterStatus === "PASSED"
        ? r.isPassed
        : !r.isPassed;

    return matchSearch && matchStatus;
  });

  const totalExaminees = results.length;
  const passedCount = results.filter((r) => r.isPassed).length;
  const avgScore =
    totalExaminees > 0
      ? (results.reduce((sum, r) => sum + r.totalScore, 0) / totalExaminees).toFixed(2)
      : "0";
  const passRate =
    totalExaminees > 0 ? ((passedCount / totalExaminees) * 100).toFixed(1) : "0";

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-slate-700">กำลังโหลดรายชื่อและผลการสอบ...</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="space-y-4">
        <Link
          href={`/instructor/courses/${params.id}/assessments`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังชุดข้อสอบและแบบทดสอบ
        </Link>
        <Alert type="error" message={error || "ไม่พบข้อมูลแบบทดสอบ"} />
      </div>
    );
  }

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
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-mono">
                {exam.course.code}
              </span>
              <span className="text-xs text-slate-500 font-medium">{exam.examType}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              ผลการสอบ: {exam.title}
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              รายชื่อนักศึกษา คะแนนที่ได้ และการประเมินผลรายบุคคล
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/instructor/courses/${params.id}/exams/${params.examId}/analytics`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition"
            >
              <BarChart3 className="w-4 h-4" /> ดูสถิติและวิเคราะห์ข้อสอบ (Analytics)
            </Link>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">จำนวนผู้เข้าสอบ</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalExaminees} คน</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">คะแนนเฉลี่ย</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            {avgScore} / {exam.totalScore}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">ผ่านเกณฑ์</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{passedCount} คน</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">อัตราการผ่าน</span>
          <p className="text-2xl font-bold text-teal-600 mt-1">{passRate}%</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, รหัสนักศึกษา, อีเมล..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterStatus === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            ทั้งหมด ({results.length})
          </button>
          <button
            onClick={() => setFilterStatus("PASSED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterStatus === "PASSED"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            ผ่านเกณฑ์ ({passedCount})
          </button>
          <button
            onClick={() => setFilterStatus("FAILED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterStatus === "FAILED"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            ไม่ผ่าน ({totalExaminees - passedCount})
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredResults.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            {results.length === 0
              ? "ยังไม่มีนักศึกษาเข้าสอบในแบบทดสอบนี้"
              : "ไม่พบข้อมูลนักศึกษาที่ตรงกับการค้นหา"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">นักศึกษา</th>
                  <th className="px-6 py-3.5">คะแนนที่ได้</th>
                  <th className="px-6 py-3.5">ร้อยละ (%)</th>
                  <th className="px-6 py-3.5">ผลการสอบ</th>
                  <th className="px-6 py-3.5">วันที่ส่ง</th>
                  <th className="px-6 py-3.5">เวลาที่ใช้</th>
                  <th className="px-6 py-3.5 text-center">สลับแท็บ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredResults.map((r) => (
                  <tr key={r.attemptId} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{r.studentName}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {r.studentCode !== "-" ? r.studentCode : r.studentEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 font-mono">
                      {r.totalScore} / {r.maxScore}
                    </td>
                    <td className="px-6 py-4 font-bold text-indigo-700 font-mono">
                      {r.percentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          r.isPassed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {r.isPassed ? "✓ ผ่าน" : "✗ ไม่ผ่าน"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {r.submittedAt
                        ? new Date(r.submittedAt).toLocaleString("th-TH")
                        : "กำลังสอบ"}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {formatDuration(r.timeSpentSeconds)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {r.logEventsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                          {r.logEventsCount} ครั้ง
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
