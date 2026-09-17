"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  ArrowLeft,
  Loader2,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Award,
  Calendar,
  Clock,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Eye,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";

interface StudentProgressItem {
  studentId: string;
  studentName: string;
  studentCode: string;
  studentEmail: string;
  hasPre: boolean;
  hasPost: boolean;
  isCompletedBoth: boolean;
  preScore: number | null;
  preMax: number;
  prePercent: number | null;
  preSubmittedAt: string | null;
  postScore: number | null;
  postMax: number;
  postPercent: number | null;
  postSubmittedAt: string | null;
  scoreDiff: number | null;
  percentageImprovement: number | null;
  gain: number | null;
  gainLevel: "HIGH" | "MEDIUM" | "LOW" | "INCOMPLETE";
  gainLevelText: string;
  isPassed: boolean;
}

interface CourseInfo {
  id: string;
  code: string;
  title: string;
  instructorName: string;
  totalEnrollments: number;
}

interface ExamInfo {
  id: string;
  title: string;
  totalScore: number;
}

export default function StudentProgressPage({
  params,
}: {
  params: { id: string };
}) {
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [preExam, setPreExam] = useState<ExamInfo | null>(null);
  const [postExam, setPostExam] = useState<ExamInfo | null>(null);
  const [students, setStudents] = useState<StudentProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [gainFilter, setGainFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW" | "INCOMPLETE">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "PRE_ONLY" | "POST_ONLY" | "NONE">("ALL");
  const [sortField, setSortField] = useState<"name" | "pre" | "post" | "diff" | "gain">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<StudentProgressItem | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/courses/${params.id}/progress`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "ไม่สามารถโหลดข้อมูลความก้าวหน้าได้");
        return;
      }
      setCourse(data.course);
      setPreExam(data.preExam);
      setPostExam(data.postExam);
      setStudents(data.students);
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const handleSort = (field: "name" | "pre" | "post" | "diff" | "gain") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredStudents = students
    .filter((s) => {
      const matchSearch =
        s.studentName.toLowerCase().includes(search.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(search.toLowerCase()) ||
        s.studentEmail.toLowerCase().includes(search.toLowerCase());

      const matchGain =
        gainFilter === "ALL" ? true : s.gainLevel === gainFilter;

      let matchStatus = true;
      if (statusFilter === "COMPLETED") matchStatus = s.isCompletedBoth;
      else if (statusFilter === "PRE_ONLY") matchStatus = s.hasPre && !s.hasPost;
      else if (statusFilter === "POST_ONLY") matchStatus = !s.hasPre && s.hasPost;
      else if (statusFilter === "NONE") matchStatus = !s.hasPre && !s.hasPost;

      return matchSearch && matchGain && matchStatus;
    })
    .sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;
      if (sortField === "name") {
        valA = a.studentName;
        valB = b.studentName;
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortField === "pre") {
        valA = a.prePercent ?? -1;
        valB = b.prePercent ?? -1;
      } else if (sortField === "post") {
        valA = a.postPercent ?? -1;
        valB = b.postPercent ?? -1;
      } else if (sortField === "diff") {
        valA = a.scoreDiff ?? -999;
        valB = b.scoreDiff ?? -999;
      } else if (sortField === "gain") {
        valA = a.gain ?? -999;
        valB = b.gain ?? -999;
      }
      return sortOrder === "asc" ? valA - valB : valB - valA;
    });

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-slate-700">กำลังโหลดข้อมูลความก้าวหน้าของนักศึกษา...</p>
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

  const completedCount = students.filter((s) => s.isCompletedBoth).length;
  const highGainCount = students.filter((s) => s.gainLevel === "HIGH").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/instructor/courses/${params.id}/analytics`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium mb-3 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยัง Research Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-mono">
                {course.code}
              </span>
              <span className="text-xs text-slate-500 font-medium">Student Progress Tracking</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              ติดตามความก้าวหน้ารายบุคคล (Student Progress)
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              วิเคราะห์พัฒนาการรายบุคคลจากการทำแบบทดสอบก่อนเรียนและหลังเรียน
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/api/courses/${params.id}/export?format=excel`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> ส่งออก Excel
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">นักศึกษาในวิชา</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{course.totalEnrollments} คน</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">สอบครบทั้งสองชุด</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            {completedCount} / {course.totalEnrollments} คน
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">พัฒนาการระดับสูง (&ge; 0.70)</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{highGainCount} คน</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">อัตราการทำข้อสอบครบ</span>
          <p className="text-2xl font-bold text-teal-600 mt-1">
            {course.totalEnrollments > 0 ? ((completedCount / course.totalEnrollments) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อนักศึกษา, รหัสนักศึกษา, อีเมล..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <select
            value={gainFilter}
            onChange={(e) => setGainFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
          >
            <option value="ALL">ทุกระดับพัฒนาการ</option>
            <option value="HIGH">ระดับสูง (&ge; 0.70)</option>
            <option value="MEDIUM">ระดับปานกลาง (0.30 - 0.69)</option>
            <option value="LOW">ระดับต่ำ (&lt; 0.30)</option>
            <option value="INCOMPLETE">ยังสอบไม่ครบ</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
          >
            <option value="ALL">สถานะการสอบทั้งหมด</option>
            <option value="COMPLETED">สอบครบทั้ง 2 ชุด</option>
            <option value="PRE_ONLY">ทำเฉพาะ Pre-test</option>
            <option value="POST_ONLY">ทำเฉพาะ Post-test</option>
            <option value="NONE">ยังไม่ทำข้อสอบ</option>
          </select>
        </div>
      </div>

      {/* Progress Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            ไม่พบข้อมูลนักศึกษาตามเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 cursor-pointer" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1">
                      นักศึกษา <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 text-center cursor-pointer" onClick={() => handleSort("pre")}>
                    <div className="flex items-center justify-center gap-1">
                      Pre-test (%) <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 text-center cursor-pointer" onClick={() => handleSort("post")}>
                    <div className="flex items-center justify-center gap-1">
                      Post-test (%) <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 text-center cursor-pointer" onClick={() => handleSort("diff")}>
                    <div className="flex items-center justify-center gap-1">
                      ผลต่าง (%) <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 text-center cursor-pointer" onClick={() => handleSort("gain")}>
                    <div className="flex items-center justify-center gap-1">
                      Normalized Gain &lt;g&gt; <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5">ระดับพัฒนาการ</th>
                  <th className="px-6 py-3.5 text-center">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.map((s) => (
                  <tr key={s.studentId} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{s.studentName}</div>
                      <div className="text-xs text-slate-400 font-mono">{s.studentCode}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono">
                      {s.hasPre && s.prePercent !== null ? (
                        <div>
                          <span className="font-bold text-slate-800">{s.prePercent.toFixed(1)}%</span>
                          <span className="block text-[10px] text-slate-400">({s.preScore}/{s.preMax})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-mono">
                      {s.hasPost && s.postPercent !== null ? (
                        <div>
                          <span className="font-bold text-emerald-700">{s.postPercent.toFixed(1)}%</span>
                          <span className="block text-[10px] text-slate-400">({s.postScore}/{s.postMax})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold">
                      {s.scoreDiff !== null ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs ${
                            s.scoreDiff >= 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                          }`}
                        >
                          {s.scoreDiff >= 0 ? `+${s.scoreDiff.toFixed(1)}%` : `${s.scoreDiff.toFixed(1)}%`}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-extrabold text-sm text-indigo-700">
                      {s.gain !== null ? s.gain.toFixed(3) : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          s.gainLevel === "HIGH"
                            ? "bg-emerald-100 text-emerald-800"
                            : s.gainLevel === "MEDIUM"
                            ? "bg-blue-100 text-blue-800"
                            : s.gainLevel === "LOW"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {s.gainLevel === "HIGH"
                          ? "✓ ระดับสูง"
                          : s.gainLevel === "MEDIUM"
                          ? "• ระดับปานกลาง"
                          : s.gainLevel === "LOW"
                          ? "✗ ระดับต่ำ"
                          : "ยังสอบไม่ครบ"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedStudent(s)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Individual Student Detail Modal */}
      {selectedStudent && (
        <Modal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          title={`ข้อมูลพัฒนาการ: ${selectedStudent.studentName}`}
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">รหัสนักศึกษา:</span>
                <span className="font-mono font-bold text-slate-900">{selectedStudent.studentCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">อีเมล:</span>
                <span className="font-mono text-slate-900">{selectedStudent.studentEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">สถานะการสอบ:</span>
                <span className="font-bold">
                  {selectedStudent.isCompletedBoth
                    ? "✓ ครบทั้ง Pre-test และ Post-test"
                    : selectedStudent.hasPre
                    ? "ทำเฉพาะ Pre-test"
                    : selectedStudent.hasPost
                    ? "ทำเฉพาะ Post-test"
                    : "ยังไม่ได้ทำข้อสอบ"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 text-center">
                <span className="text-indigo-800 font-bold block mb-1">ผลสอบก่อนเรียน (Pre-test)</span>
                {selectedStudent.hasPre ? (
                  <>
                    <p className="text-xl font-bold font-mono text-slate-900">{selectedStudent.preScore} / {selectedStudent.preMax}</p>
                    <span className="text-indigo-700 font-bold">{selectedStudent.prePercent}%</span>
                  </>
                ) : (
                  <span className="text-slate-400">ยังไม่เข้าสอบ</span>
                )}
              </div>

              <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 text-center">
                <span className="text-emerald-800 font-bold block mb-1">ผลสอบหลังเรียน (Post-test)</span>
                {selectedStudent.hasPost ? (
                  <>
                    <p className="text-xl font-bold font-mono text-slate-900">{selectedStudent.postScore} / {selectedStudent.postMax}</p>
                    <span className="text-emerald-700 font-bold">{selectedStudent.postPercent}%</span>
                  </>
                ) : (
                  <span className="text-slate-400">ยังไม่เข้าสอบ</span>
                )}
              </div>
            </div>

            {selectedStudent.isCompletedBoth && (
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">ผลต่างคะแนน:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {selectedStudent.scoreDiff! >= 0 ? `+${selectedStudent.scoreDiff}%` : `${selectedStudent.scoreDiff}%`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">พัฒนาการร้อยละ:</span>
                  <span className="font-mono font-bold text-white">
                    {selectedStudent.percentageImprovement! >= 0 ? `+${selectedStudent.percentageImprovement}%` : `${selectedStudent.percentageImprovement}%`}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                  <span className="text-indigo-300 font-bold">Normalized Gain &lt;g&gt;:</span>
                  <span className="font-mono text-lg font-extrabold text-emerald-400">
                    {selectedStudent.gain!.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">ระดับพัฒนาการ:</span>
                  <span className="font-bold text-white">{selectedStudent.gainLevelText}</span>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
