import * as XLSX from "xlsx";
import {
  PrePostClassAnalytics,
  ItemAnalysisResult,
  DescriptiveStats,
} from "./analytics";

export interface ResearchExportData {
  course: {
    code: string;
    title: string;
    instructorName?: string;
  };
  preExamTitle: string;
  postExamTitle: string;
  analytics: PrePostClassAnalytics;
  itemAnalysis?: ItemAnalysisResult[];
}

/**
 * Generates CSV string with UTF-8 BOM for Thai language Excel support
 */
export function generateResearchCSV(data: ResearchExportData): string {
  const BOM = "\uFEFF";
  const rows: string[] = [];

  // Course Header
  rows.push(`"รายงานผลสัมฤทธิ์ทางการเรียนและข้อมูลงานวิจัย"`);
  rows.push(`"รายวิชา:","${data.course.code} ${data.course.title}"`);
  rows.push(`"ชุดก่อนเรียน (Pre-test):","${data.preExamTitle}"`);
  rows.push(`"ชุดหลังเรียน (Post-test):","${data.postExamTitle}"`);
  rows.push(`"วันที่ส่งออกข้อมูล:","${new Date().toLocaleDateString("th-TH")}"`);
  rows.push("");

  // Table Header
  rows.push(
    [
      "ลำดับ",
      "รหัสนักศึกษา",
      "ชื่อ-นามสกุล",
      "คะแนน Pre-test",
      "คะแนนเต็ม Pre",
      "ร้อยละ Pre (%)",
      "คะแนน Post-test",
      "คะแนนเต็ม Post",
      "ร้อยละ Post (%)",
      "ผลต่าง (%)",
      "พัฒนาการร้อยละ (% Improvement)",
      "Normalized Gain <g>",
      "ระดับพัฒนาการ",
      "ผลการประเมิน",
    ]
      .map((c) => `"${c}"`)
      .join(",")
  );

  // Student Rows
  data.analytics.studentGains.forEach((s, idx) => {
    const row = [
      idx + 1,
      s.studentCode || "-",
      s.studentName,
      s.preTestScore,
      s.preTestTotal,
      s.preTestPercent.toFixed(1),
      s.postTestScore,
      s.postTestTotal,
      s.postTestPercent.toFixed(1),
      s.scoreDifference >= 0 ? `+${s.scoreDifference.toFixed(1)}` : s.scoreDifference.toFixed(1),
      s.percentageImprovement >= 0 ? `+${s.percentageImprovement.toFixed(1)}%` : `${s.percentageImprovement.toFixed(1)}%`,
      s.gain.toFixed(3),
      s.gainLevelText,
      s.isPassed ? "ผ่านเกณฑ์" : "ไม่ผ่านเกณฑ์",
    ];
    rows.push(row.map((val) => `"${val}"`).join(","));
  });

  rows.push("");
  rows.push(`"สถิติสรุปภาพรวม (Summary Statistics)"`);
  rows.push(`"จำนวนกลุ่มตัวอย่าง (N):","${data.analytics.totalMatchedStudents}"`);
  rows.push(`"คะแนนเฉลี่ยก่อนเรียน (Pre-test %):","${data.analytics.avgPrePercent.toFixed(2)}%"`);
  rows.push(`"คะแนนเฉลี่ยหลังเรียน (Post-test %):","${data.analytics.avgPostPercent.toFixed(2)}%"`);
  rows.push(`"ผลต่างคะแนนเฉลี่ย (Mean Difference):","${data.analytics.meanDifference >= 0 ? "+" : ""}${data.analytics.meanDifference.toFixed(2)}%"`);
  rows.push(`"พัฒนาการสัมพัทธ์ของชั้นเรียน (Class Hake Gain):","${data.analytics.hakeClassGain.toFixed(3)}"`);
  rows.push(`"ระดับพัฒนาการของชั้นเรียน:","${data.analytics.hakeClassGainLevelText}"`);

  if (data.analytics.tTest) {
    rows.push(`"ค่าสถิติ t (t-value):","${data.analytics.tTest.tValue.toFixed(3)}"`);
    rows.push(`"องศาอิสระ (df):","${data.analytics.tTest.df}"`);
    rows.push(`"ค่า p (p-value):","${data.analytics.tTest.pValueFormatted}"`);
    rows.push(`"นัยสำคัญทางสถิติ:","${data.analytics.tTest.isSignificant ? "มีนัยสำคัญที่ระดับ .05" : "ไม่มีนัยสำคัญ"}"`);
    rows.push(`"ขนาดอิทธิพล (Cohen's d):","${data.analytics.tTest.cohensD} (${data.analytics.tTest.effectSizeText})"`);
  }

  return BOM + rows.join("\r\n");
}

/**
 * Generates Excel Buffer with 4 Research-Ready Sheets
 */
export function generateResearchExcelBuffer(data: ResearchExportData): Buffer {
  const wb = XLSX.utils.book_new();

  // ----------------------------------------------------
  // Sheet 1: Research Data
  // ----------------------------------------------------
  const researchDataRows = data.analytics.studentGains.map((s, idx) => ({
    "ลำดับ": idx + 1,
    "รหัสนักศึกษา": s.studentCode || "-",
    "ชื่อ-นามสกุล": s.studentName,
    "คะแนนก่อนเรียน": s.preTestScore,
    "คะแนนเต็มก่อนเรียน": s.preTestTotal,
    "ร้อยละก่อนเรียน (%)": s.preTestPercent,
    "คะแนนหลังเรียน": s.postTestScore,
    "คะแนนเต็มหลังเรียน": s.postTestTotal,
    "ร้อยละหลังเรียน (%)": s.postTestPercent,
    "ผลต่างคะแนน (%)": s.scoreDifference,
    "พัฒนาการร้อยละ (%)": s.percentageImprovement,
    "Normalized Gain <g>": s.gain,
    "ระดับพัฒนาการ": s.gainLevelText,
    "ผลการประเมิน": s.isPassed ? "ผ่านเกณฑ์" : "ไม่ผ่านเกณฑ์",
  }));
  const wsResearch = XLSX.utils.json_to_sheet(researchDataRows);
  XLSX.utils.book_append_sheet(wb, wsResearch, "Research Data");

  // ----------------------------------------------------
  // Sheet 2: Summary Statistics
  // ----------------------------------------------------
  const summaryRows = [
    { "ตัวชี้วัดทางสถิติ (Statistics)": "รหัสวิชา", "ค่าที่ได้ (Value)": data.course.code },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "ชื่อรายวิชา", "ค่าที่ได้ (Value)": data.course.title },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "จำนวนกลุ่มตัวอย่าง (N)", "ค่าที่ได้ (Value)": data.analytics.totalMatchedStudents },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "คะแนนเฉลี่ยก่อนเรียน (Mean Pre-test %)", "ค่าที่ได้ (Value)": data.analytics.avgPrePercent },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "คะแนนเฉลี่ยหลังเรียน (Mean Post-test %)", "ค่าที่ได้ (Value)": data.analytics.avgPostPercent },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "ผลต่างคะแนนเฉลี่ย (Mean Difference %)", "ค่าที่ได้ (Value)": data.analytics.meanDifference },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "พัฒนาการร้อยละของชั้นเรียน (% Improvement)", "ค่าที่ได้ (Value)": data.analytics.classPercentageImprovement },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "ส่วนเบี่ยงเบนก่อนเรียน (SD Pre)", "ค่าที่ได้ (Value)": data.analytics.sdPrePercent },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "ส่วนเบี่ยงเบนหลังเรียน (SD Post)", "ค่าที่ได้ (Value)": data.analytics.sdPostPercent },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "มัธยฐานก่อนเรียน (Median Pre %)", "ค่าที่ได้ (Value)": data.analytics.medianPrePercent },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "มัธยฐานหลังเรียน (Median Post %)", "ค่าที่ได้ (Value)": data.analytics.medianPostPercent },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "คะแนนต่ำสุดก่อนเรียน (Min Pre %)", "ค่าที่ได้ (Value)": data.analytics.minPrePercent },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "คะแนนสูงสุดก่อนเรียน (Max Pre %)", "ค่าที่ได้ (Value)": data.analytics.maxPrePercent },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "คะแนนต่ำสุดหลังเรียน (Min Post %)", "ค่าที่ได้ (Value)": data.analytics.minPostPercent },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "คะแนนสูงสุดหลังเรียน (Max Post %)", "ค่าที่ได้ (Value)": data.analytics.maxPostPercent },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "อัตราการผ่านเกณฑ์หลังเรียน (Pass Rate %)", "ค่าที่ได้ (Value)": data.analytics.passRate },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "ดัชนีพัฒนาการเฉลี่ยรายบุคคล (Individual Average <g>)", "ค่าที่ได้ (Value)": data.analytics.classAverageGain },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "ดัชนีพัฒนาการสัมพัทธ์ของชั้นเรียน (Class Hake Gain <g>)", "ค่าที่ได้ (Value)": data.analytics.hakeClassGain },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "ระดับพัฒนาการของชั้นเรียน", "ค่าที่ได้ (Value)": data.analytics.hakeClassGainLevelText },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "จำนวนนักศึกษาพัฒนาการระดับสูง (High Gain)", "ค่าที่ได้ (Value)": data.analytics.highGainCount },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "จำนวนนักศึกษาพัฒนาการระดับปานกลาง (Medium Gain)", "ค่าที่ได้ (Value)": data.analytics.mediumGainCount },
    { "ตัวชี้วัดทางสถิติ (Statistics)": "จำนวนนักศึกษาพัฒนาการระดับต่ำ (Low Gain)", "ค่าที่ได้ (Value)": data.analytics.lowGainCount },
  ];

  if (data.analytics.tTest) {
    summaryRows.push(
      { "ตัวชี้วัดทางสถิติ (Statistics)": "ค่าสถิติทดสอบที (t-value)", "ค่าที่ได้ (Value)": data.analytics.tTest.tValue },
      { "ตัวชี้วัดทางสถิติ (Statistics)": "องศาอิสระ (df)", "ค่าที่ได้ (Value)": data.analytics.tTest.df },
      { "ตัวชี้วัดทางสถิติ (Statistics)": "ค่าความน่าจะเป็น (p-value)", "ค่าที่ได้ (Value)": data.analytics.tTest.pValue },
      { "ตัวชี้วัดทางสถิติ (Statistics)": "การมีนัยสำคัญทางสถิติ (alpha = 0.05)", "ค่าที่ได้ (Value)": data.analytics.tTest.isSignificant ? "มีนัยสำคัญทางสถิติที่ระดับ .05" : "ไม่มีนัยสำคัญ" },
      { "ตัวชี้วัดทางสถิติ (Statistics)": "ขนาดอิทธิพล (Cohen's d)", "ค่าที่ได้ (Value)": data.analytics.tTest.cohensD },
      { "ตัวชี้วัดทางสถิติ (Statistics)": "ระดับขนาดอิทธิพล (Effect Size Level)", "ค่าที่ได้ (Value)": data.analytics.tTest.effectSizeText }
    );
  }

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary Statistics");

  // ----------------------------------------------------
  // Sheet 3: Item Analysis
  // ----------------------------------------------------
  if (data.itemAnalysis && data.itemAnalysis.length > 0) {
    const itemRows = data.itemAnalysis.map((item, idx) => ({
      "ข้อที่": idx + 1,
      "คำถาม": item.questionText,
      "ประเภท": item.questionType,
      "ระดับความยาก": item.difficultyLevel,
      "ดัชนีความยากง่าย (p)": item.difficultyIndex,
      "การแปลผลความยากง่าย": item.difficultyText,
      "ดัชนีอำนาจจำแนก (r)": item.discriminationIndex,
      "การแปลผลอำนาจจำแนก": item.discriminationText,
      "จำนวนผู้ตอบถูก": item.correctCount,
      "จำนวนผู้ตอบผิด": item.incorrectCount,
      "จำนวนผู้เข้าสอบทั้งหมด": item.totalExaminees,
    }));
    const wsItems = XLSX.utils.json_to_sheet(itemRows);
    XLSX.utils.book_append_sheet(wb, wsItems, "Item Analysis");
  }

  // ----------------------------------------------------
  // Sheet 4: Pre-Post Comparison
  // ----------------------------------------------------
  const comparisonRows = data.analytics.studentGains.map((s, idx) => ({
    "ลำดับ": idx + 1,
    "รหัสนักศึกษา": s.studentCode || "-",
    "ชื่อ-นามสกุล": s.studentName,
    "Pre-test (%)": s.preTestPercent,
    "Post-test (%)": s.postTestPercent,
    "Difference (%)": s.scoreDifference,
    "Normalized Gain <g>": s.gain,
    "Gain Level": s.gainLevel,
  }));
  const wsComparison = XLSX.utils.json_to_sheet(comparisonRows);
  XLSX.utils.book_append_sheet(wb, wsComparison, "Pre-Post Comparison");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
