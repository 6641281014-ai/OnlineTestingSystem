"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Printer,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  BookOpen,
  Scale,
  Award,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import {
  PrePostClassAnalytics,
  ItemAnalysisResult,
  PairedTTestResult,
} from "@/lib/analytics";

interface ResearchReportResponse {
  success: boolean;
  hasData: boolean;
  reportDate: string;
  course: {
    id: string;
    code: string;
    title: string;
    instructorName: string;
    enrollmentsCount: number;
  };
  preExam: { id: string; title: string; totalScore: number; participantsCount: number };
  postExam: { id: string; title: string; totalScore: number; participantsCount: number };
  analytics: PrePostClassAnalytics;
  postItemAnalysis: ItemAnalysisResult[] | null;
}

export default function ResearchReportPreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const [data, setData] = useState<ResearchReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/courses/${params.id}/research-report`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "ไม่สามารถสร้างรายงานวิจัยได้");
        return;
      }
      setData(json);
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-slate-700">กำลังรวบรวมและสังเคราะห์รายงานวิจัย (Chapter 4 Report)...</p>
      </div>
    );
  }

  if (error || !data || !data.hasData) {
    return (
      <div className="space-y-4">
        <Link
          href={`/instructor/courses/${params.id}/analytics`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยัง Research Dashboard
        </Link>
        <Alert type="error" message={error || "ไม่พบข้อมูลสำหรับสร้างรายงานวิจัย"} />
      </div>
    );
  }

  const { course, preExam, postExam, analytics, postItemAnalysis, reportDate } = data;
  const tTest = analytics.tTest;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Non-printable Action Bar */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <Link
          href={`/instructor/courses/${params.id}/analytics`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยัง Research Dashboard
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition"
          >
            <Printer className="w-4 h-4" /> พิมพ์รายงาน / บันทึกเป็น PDF
          </button>
          <Link
            href={`/api/courses/${params.id}/export?format=excel`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm transition"
          >
            <Download className="w-4 h-4" /> ดาวน์โหลด Excel (.xlsx)
          </Link>
        </div>
      </div>

      {/* Printable Report Document (A4 Styling) */}
      <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0 print:m-0 text-slate-800 leading-relaxed font-sans">
        {/* Document Header */}
        <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 uppercase tracking-tight">
            รายงานผลการวิเคราะห์ข้อมูลและประเมินผลสัมฤทธิ์ทางการเรียน
          </h1>
          <p className="text-sm font-semibold text-slate-700">
            (Academic Achievement Evaluation & Statistical Research Report)
          </p>
          <div className="text-xs text-slate-500 pt-2 flex flex-wrap justify-center gap-x-6 gap-y-1">
            <span><b>รายวิชา:</b> {course.code} {course.title}</span>
            <span><b>ผู้สอน/ผู้วิจัย:</b> {course.instructorName}</span>
            <span><b>วันที่จัดทำรายงาน:</b> {reportDate}</span>
          </div>
        </div>

        {/* Section 1: Executive Methodology & Population Summary */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-950 border-l-4 border-indigo-600 pl-3 uppercase">
            1. ข้อมูลทั่วไปและกลุ่มตัวอย่าง (General Demographics & Sample Size)
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed text-justify">
            การประเมินผลสัมฤทธิ์ทางการเรียนในรายวิชา <b>{course.code} {course.title}</b> มีนักศึกษาลงทะเบียนในรายวิชาจำนวนทั้งสิ้น <b>{course.enrollmentsCount}</b> คน ดำเนินการทดสอบวัดผลสัมฤทธิ์ก่อนเรียน (Pre-test) ด้วยชุดแบบทดสอบ <b>&ldquo;{preExam.title}&rdquo;</b> (ผู้เข้าสอบ {preExam.participantsCount} คน) และแบบทดสอบวัดผลสัมฤทธิ์หลังเรียน (Post-test) ด้วยชุดแบบทดสอบ <b>&ldquo;{postExam.title}&rdquo;</b> (ผู้เข้าสอบ {postExam.participantsCount} คน) โดยมีนักศึกษาที่เข้าสอบครบทั้งสองชุดและนำมาวิเคราะห์เปรียบเทียบผลทางสถิติ (Matched Sample Size: N) จำนวนทั้งสิ้น <b>{analytics.totalMatchedStudents}</b> คน
          </p>
        </div>

        {/* Section 2: Table 4.1 Descriptive Comparison */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-950 border-l-4 border-indigo-600 pl-3 uppercase">
            2. ผลการวิเคราะห์คะแนนเฉลี่ยก่อนเรียนและหลังเรียน (Pre/Post Descriptive Comparison)
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            ตารางที่ 1: การเปรียบเทียบคะแนนเฉลี่ย ส่วนเบี่ยงเบนมาตรฐาน และมัธยฐานก่อนเรียนและหลังเรียน (N = {analytics.totalMatchedStudents})
          </p>

          <div className="overflow-x-auto border border-slate-300 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <tr>
                  <th className="px-4 py-3">การทดสอบ (Testing Phase)</th>
                  <th className="px-4 py-3 text-center">คะแนนเต็ม</th>
                  <th className="px-4 py-3 text-center">ค่าเฉลี่ยร้อยละ (&macr;X)</th>
                  <th className="px-4 py-3 text-center">ส่วนเบี่ยงเบนมาตรฐาน (SD)</th>
                  <th className="px-4 py-3 text-center">มัธยฐาน (Median)</th>
                  <th className="px-4 py-3 text-center">คะแนนต่ำสุด (Min)</th>
                  <th className="px-4 py-3 text-center">คะแนนสูงสุด (Max)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-2.5 font-semibold">ก่อนเรียน (Pre-test)</td>
                  <td className="px-4 py-2.5 text-center font-mono">{preExam.totalScore}</td>
                  <td className="px-4 py-2.5 text-center font-mono font-bold">{analytics.avgPrePercent.toFixed(2)}%</td>
                  <td className="px-4 py-2.5 text-center font-mono">{analytics.sdPrePercent.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-center font-mono">{analytics.medianPrePercent.toFixed(2)}%</td>
                  <td className="px-4 py-2.5 text-center font-mono">{analytics.minPrePercent.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-center font-mono">{analytics.maxPrePercent.toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-semibold">หลังเรียน (Post-test)</td>
                  <td className="px-4 py-2.5 text-center font-mono">{postExam.totalScore}</td>
                  <td className="px-4 py-2.5 text-center font-mono font-bold text-indigo-900">{analytics.avgPostPercent.toFixed(2)}%</td>
                  <td className="px-4 py-2.5 text-center font-mono">{analytics.sdPostPercent.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-center font-mono">{analytics.medianPostPercent.toFixed(2)}%</td>
                  <td className="px-4 py-2.5 text-center font-mono">{analytics.minPostPercent.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-center font-mono">{analytics.maxPostPercent.toFixed(1)}%</td>
                </tr>
                <tr className="bg-slate-50 font-bold">
                  <td className="px-4 py-2.5 text-indigo-950">ผลต่างคะแนนเฉลี่ย (&macr;D)</td>
                  <td className="px-4 py-2.5 text-center">-</td>
                  <td className="px-4 py-2.5 text-center font-mono text-emerald-700">
                    {analytics.meanDifference >= 0 ? `+${analytics.meanDifference.toFixed(2)}%` : `${analytics.meanDifference.toFixed(2)}%`}
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono">{tTest?.sdDiff.toFixed(2) || "-"}</td>
                  <td className="px-4 py-2.5 text-center" colSpan={3}>
                    พัฒนาการร้อยละ: +{analytics.classPercentageImprovement.toFixed(2)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Table 4.2 Dependent Samples t-test & Hypothesis Testing */}
        {tTest && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-950 border-l-4 border-indigo-600 pl-3 uppercase">
              3. ผลการทดสอบสมมติฐานทางสถิติ (Dependent Samples t-test & Effect Size)
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              ตารางที่ 2: ผลการทดสอบความแตกต่างของคะแนนก่อนเรียนและหลังเรียนด้วยสถิติ Dependent Samples t-test (&alpha; = 0.05)
            </p>

            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="px-4 py-3">กลุ่มตัวอย่าง</th>
                    <th className="px-4 py-3 text-center">N</th>
                    <th className="px-4 py-3 text-center">&macr;D (Mean Diff)</th>
                    <th className="px-4 py-3 text-center">SD (Diff)</th>
                    <th className="px-4 py-3 text-center">t-value</th>
                    <th className="px-4 py-3 text-center">df</th>
                    <th className="px-4 py-3 text-center">p-value (Sig.)</th>
                    <th className="px-4 py-3 text-center">Cohen&apos;s d</th>
                    <th className="px-4 py-3">ระดับขนาดอิทธิพล</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3 font-semibold">นักศึกษาในรายวิชา</td>
                    <td className="px-4 py-3 text-center font-mono">{tTest.n}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold">{tTest.meanDiff >= 0 ? `+${tTest.meanDiff.toFixed(2)}` : tTest.meanDiff.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center font-mono">{tTest.sdDiff.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-indigo-900">{tTest.tValue.toFixed(3)}</td>
                    <td className="px-4 py-3 text-center font-mono">{tTest.df}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-emerald-700">{tTest.pValueFormatted}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold">{tTest.cohensD}</td>
                    <td className="px-4 py-3 text-[11px] font-semibold">{tTest.effectSizeText}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              * มีนัยสำคัญทางสถิติที่ระดับ .05 (p &lt; .05)
            </p>
          </div>
        )}

        {/* Section 4: Table 4.3 Normalized Gain <g> */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-950 border-l-4 border-indigo-600 pl-3 uppercase">
            4. ผลการวิเคราะห์ดัชนีพัฒนาการสัมพัทธ์ (Relative Academic Gain: &lt;g&gt;)
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            ตารางที่ 3: การแจกแจงระดับพัฒนาการของนักศึกษาตามเกณฑ์ของ Hake (1998)
          </p>

          <div className="overflow-x-auto border border-slate-300 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <tr>
                  <th className="px-4 py-3">ระดับพัฒนาการ (Gain Level)</th>
                  <th className="px-4 py-3">เกณฑ์การประเมินค่า &lt;g&gt;</th>
                  <th className="px-4 py-3 text-center">จำนวนนักศึกษา (คน)</th>
                  <th className="px-4 py-3 text-center">คิดเป็นร้อยละ (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-emerald-800">พัฒนาการระดับสูง (High Gain)</td>
                  <td className="px-4 py-2.5 font-mono">&lt;g&gt; &ge; 0.70</td>
                  <td className="px-4 py-2.5 text-center font-mono font-bold">{analytics.highGainCount}</td>
                  <td className="px-4 py-2.5 text-center font-mono">
                    {analytics.totalMatchedStudents > 0 ? ((analytics.highGainCount / analytics.totalMatchedStudents) * 100).toFixed(2) : 0}%
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-blue-800">พัฒนาการระดับปานกลาง (Medium Gain)</td>
                  <td className="px-4 py-2.5 font-mono">0.30 &le; &lt;g&gt; &lt; 0.70</td>
                  <td className="px-4 py-2.5 text-center font-mono font-bold">{analytics.mediumGainCount}</td>
                  <td className="px-4 py-2.5 text-center font-mono">
                    {analytics.totalMatchedStudents > 0 ? ((analytics.mediumGainCount / analytics.totalMatchedStudents) * 100).toFixed(2) : 0}%
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-rose-800">พัฒนาการระดับต่ำ (Low Gain)</td>
                  <td className="px-4 py-2.5 font-mono">&lt;g&gt; &lt; 0.30</td>
                  <td className="px-4 py-2.5 text-center font-mono font-bold">{analytics.lowGainCount}</td>
                  <td className="px-4 py-2.5 text-center font-mono">
                    {analytics.totalMatchedStudents > 0 ? ((analytics.lowGainCount / analytics.totalMatchedStudents) * 100).toFixed(2) : 0}%
                  </td>
                </tr>
                <tr className="bg-slate-50 font-bold">
                  <td className="px-4 py-2.5">รวมกลุ่มตัวอย่างทั้งหมด</td>
                  <td className="px-4 py-2.5 font-mono">Hake Class Gain = {analytics.hakeClassGain.toFixed(3)}</td>
                  <td className="px-4 py-2.5 text-center font-mono">{analytics.totalMatchedStudents}</td>
                  <td className="px-4 py-2.5 text-center font-mono">100.00%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5: Table 4.4 Item Analysis Summary */}
        {postItemAnalysis && postItemAnalysis.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-950 border-l-4 border-indigo-600 pl-3 uppercase">
              5. ผลการวิเคราะห์คุณภาพเครื่องมือวัดผล (Item Analysis Summary)
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              ตารางที่ 4: ค่าความยากง่าย (p) และค่าอำนาจจำแนก (r) ของแบบทดสอบหลังเรียน ({postItemAnalysis.length} ข้อ)
            </p>

            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="px-3 py-2.5 text-center">ข้อที่</th>
                    <th className="px-3 py-2.5">คำถาม</th>
                    <th className="px-3 py-2.5 text-center">ตอบถูก/ทั้งหมด</th>
                    <th className="px-3 py-2.5 text-center">ความยากง่าย (p)</th>
                    <th className="px-3 py-2.5 text-center">อำนาจจำแนก (r)</th>
                    <th className="px-3 py-2.5">การแปลผลคุณภาพ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {postItemAnalysis.map((item, idx) => (
                    <tr key={item.questionId}>
                      <td className="px-3 py-2 text-center font-mono font-bold">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium line-clamp-1">{item.questionText}</td>
                      <td className="px-3 py-2 text-center font-mono">{item.correctCount}/{item.totalExaminees}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold">{item.difficultyIndex}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold">{item.discriminationIndex}</td>
                      <td className="px-3 py-2 text-[11px] font-semibold">{item.discriminationText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 6: Synthesized Academic Findings Discussion */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-bold text-slate-950 border-l-4 border-indigo-600 pl-3 uppercase">
            6. บทสรุปและการอภิปรายผลการวิจัย (Academic Synthesis & Conclusion)
          </h2>
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 leading-relaxed text-justify space-y-3">
            <p>
              {tTest?.academicSummaryText ||
                `จากการวิเคราะห์ผลการสอบของนักศึกษาจำนวน ${analytics.totalMatchedStudents} คน พบว่า คะแนนเฉลี่ยก่อนเรียนเท่ากับ ${analytics.avgPrePercent.toFixed(2)}% และคะแนนเฉลี่ยหลังเรียนเท่ากับ ${analytics.avgPostPercent.toFixed(2)}%`}
            </p>
            <p>
              เมื่อพิจารณาพัฒนาการสัมพัทธ์ของชั้นเรียนตามแนวคิดของ Hake (1998) พบว่า ชั้นเรียนมีค่าเฉลี่ยดัชนีพัฒนาการสัมพัทธ์ (&lt;g&gt;) เท่ากับ <b>{analytics.hakeClassGain.toFixed(3)}</b> ซึ่งจัดอยู่ใน <b>{analytics.hakeClassGainLevelText}</b> โดยมีนักศึกษาที่บรรลุพัฒนาการระดับสูงจำนวน {analytics.highGainCount} คน คิดเป็นร้อยละ {analytics.totalMatchedStudents > 0 ? ((analytics.highGainCount / analytics.totalMatchedStudents) * 100).toFixed(1) : 0}% แสดงให้เห็นว่าการจัดกิจกรรมการเรียนรู้มีประสิทธิภาพในการยกระดับผลสัมฤทธิ์ทางการเรียนของผู้เรียนได้อย่างเป็นรูปธรรม
            </p>
          </div>
        </div>

        {/* Signature Box for Academic Thesis Chapter 4 */}
        <div className="pt-8 grid grid-cols-2 text-center text-xs text-slate-700">
          <div>
            <p>ลงชื่อ ..............................................................</p>
            <p className="mt-1 font-semibold">({course.instructorName})</p>
            <p className="text-slate-500">อาจารย์ผู้รับผิดชอบรายวิชา / ผู้วิจัย</p>
          </div>
          <div>
            <p>ลงชื่อ ..............................................................</p>
            <p className="mt-1 font-semibold">(..............................................................)</p>
            <p className="text-slate-500">หัวหน้าภาควิชา / ประธานหลักสูตร</p>
          </div>
        </div>
      </div>
    </div>
  );
}
