"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  ArrowLeft,
  Loader2,
  Users,
  CheckCircle2,
  TrendingUp,
  Download,
  FileText,
  Search,
  Filter,
  Calculator,
  ArrowRight,
  Sparkles,
  BarChart3,
  Scale,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import {
  PrePostClassAnalytics,
  StudentGainResult,
} from "@/lib/analytics";

export default function CourseReportsPage({
  params,
}: {
  params: { id: string };
}) {
  const [course, setCourse] = useState<any>(null);
  const [analytics, setAnalytics] = useState<PrePostClassAnalytics | null>(null);
  const [preExam, setPreExam] = useState<any>(null);
  const [postExam, setPostExam] = useState<any>(null);
  const [allExams, setAllExams] = useState<any[]>([]);
  const [selectedPreId, setSelectedPreId] = useState<string>("");
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [gainFilter, setGainFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [passFilter, setPassFilter] = useState<"ALL" | "PASSED" | "FAILED">("ALL");

  const fetchReports = useCallback(async (preId?: string, postId?: string) => {
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
        setError(data.message || "ไม่สามารถโหลดข้อมูลรายงานได้");
        return;
      }
      setCourse(data.course);
      setAllExams(data.allExams || []);
      setAnalytics(data.analytics);
      setPreExam(data.preExam);
      setPostExam(data.postExam);
      if (data.preExam) setSelectedPreId(data.preExam.id);
      if (data.postExam) setSelectedPostId(data.postExam.id);
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

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
        <p className="text-sm font-semibold text-slate-700">กำลังรวบรวมข้อมูลรายงานวิจัย (Research Reports)...</p>
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

  const filteredGains = analytics?.studentGains.filter((s) => {
    const matchSearch =
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      s.studentCode.toLowerCase().includes(search.toLowerCase());
    const matchGain = gainFilter === "ALL" ? true : s.gainLevel === gainFilter;
    let matchPass = true;
    if (passFilter === "PASSED") matchPass = s.isPassed;
    else if (passFilter === "FAILED") matchPass = !s.isPassed;
    return matchSearch && matchGain && matchPass;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/instructor/courses/${params.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium mb-3 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังรายวิชา
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-mono">
                {course.code}
              </span>
              <span className="text-xs text-slate-500 font-medium">Research Reporting & Data Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              รายงานข้อมูลงานวิจัยและผลสัมฤทธิ์ (Research Reports)
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              ตารางข้อมูลงานวิจัยรายบุคคล, สถิติเปรียบเทียบ Pre/Post และการส่งออกข้อมูลสำหรับ SPSS / Excel
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/instructor/courses/${params.id}/analytics`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition"
            >
              <BarChart3 className="w-3.5 h-3.5" /> Analytics Dashboard
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

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">นักศึกษาในวิชา</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{course.enrollmentsCount || 0} คน</p>
          <span className="text-[11px] text-slate-400">Pre: {preExam?.submittedCount || 0} | Post: {postExam?.submittedCount || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">คะแนนเฉลี่ย Pre vs Post</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {analytics?.avgPrePercent.toFixed(1) || 0}% &rarr; {analytics?.avgPostPercent.toFixed(1) || 0}%
          </p>
          <span className="text-[11px] text-emerald-600 font-bold">
            +{analytics?.meanDifference.toFixed(1) || 0}% Diff
          </span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Class Hake Gain &lt;g&gt;</span>
          <p className="text-2xl font-bold text-indigo-600 font-mono mt-1">
            {analytics?.hakeClassGain.toFixed(3) || "0.000"}
          </p>
          <span className="text-[11px] text-slate-500">{analytics?.hakeClassGainLevelText || "-"}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">การแจกแจง Gain</span>
          <p className="text-sm font-bold text-slate-900 mt-2 flex items-center gap-1.5">
            <span className="text-emerald-600">สูง: {analytics?.highGainCount || 0}</span> |{" "}
            <span className="text-blue-600">กลาง: {analytics?.mediumGainCount || 0}</span> |{" "}
            <span className="text-rose-600">ต่ำ: {analytics?.lowGainCount || 0}</span>
          </p>
        </div>
      </div>

      {/* Research Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ตารางข้อมูลผลสัมฤทธิ์รายบุคคล (Research Data Table)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              จับคู่ผลการสอบ Pre-test และ Post-test ตาม studentId ({filteredGains.length} คน)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ, รหัส..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={gainFilter}
              onChange={(e) => setGainFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
            >
              <option value="ALL">ทุกระดับ Gain</option>
              <option value="HIGH">สูง (&ge; 0.70)</option>
              <option value="MEDIUM">ปานกลาง (0.30 - 0.69)</option>
              <option value="LOW">ต่ำ (&lt; 0.30)</option>
            </select>

            <select
              value={passFilter}
              onChange={(e) => setPassFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
            >
              <option value="ALL">ผลประเมินทั้งหมด</option>
              <option value="PASSED">ผ่านเกณฑ์</option>
              <option value="FAILED">ไม่ผ่านเกณฑ์</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Student ID</th>
                <th className="px-6 py-3.5">Student Name</th>
                <th className="px-6 py-3.5 text-center">Pre Score</th>
                <th className="px-6 py-3.5 text-center">Pre %</th>
                <th className="px-6 py-3.5 text-center">Post Score</th>
                <th className="px-6 py-3.5 text-center">Post %</th>
                <th className="px-6 py-3.5 text-center">Difference</th>
                <th className="px-6 py-3.5 text-center">Normalized Gain</th>
                <th className="px-6 py-3.5">Gain Level</th>
                <th className="px-6 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredGains.map((s) => (
                <tr key={s.studentId} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4 font-mono font-semibold text-xs text-slate-700">
                    {s.studentCode}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {s.studentName}
                  </td>
                  <td className="px-6 py-4 text-center font-mono font-semibold text-xs">
                    {s.preTestScore} / {s.preTestTotal}
                  </td>
                  <td className="px-6 py-4 text-center font-mono font-bold text-slate-700">
                    {s.preTestPercent.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 text-center font-mono font-semibold text-xs">
                    {s.postTestScore} / {s.postTestTotal}
                  </td>
                  <td className="px-6 py-4 text-center font-mono font-bold text-emerald-700">
                    {s.postTestPercent.toFixed(1)}%
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
                      {s.gainLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded ${
                        s.isPassed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {s.isPassed ? "ผ่าน" : "ไม่ผ่าน"}
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
