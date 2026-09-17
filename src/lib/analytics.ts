/**
 * Educational Assessment & Advanced Statistical Analysis Library
 * For Online Testing System (Academic Achievement & Research Evaluation)
 */

export interface DescriptiveStats {
  count: number;
  mean: number;
  median: number;
  max: number;
  min: number;
  sd: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
}

export interface ItemAnalysisResult {
  questionId: string;
  questionText: string;
  questionType: string;
  difficultyLevel: string; // EASY, MEDIUM, HARD from question model
  score: number;
  totalExaminees: number;
  correctCount: number;
  incorrectCount: number;
  difficultyIndex: number; // p
  difficultyText: string;
  difficultyQuality: "VERY_EASY" | "EASY" | "MODERATE" | "HARD" | "VERY_HARD";
  discriminationIndex: number; // r
  discriminationText: string;
  discriminationQuality: "VERY_GOOD" | "GOOD" | "FAIR" | "POOR" | "DEFECTIVE";
}

export interface StudentGainResult {
  studentId: string;
  studentName: string;
  studentCode: string;
  preTestScore: number;
  preTestTotal: number;
  preTestPercent: number;
  postTestScore: number;
  postTestTotal: number;
  postTestPercent: number;
  scoreDifference: number; // Post % - Pre %
  percentageImprovement: number; // ((Post - Pre) / Pre) * 100
  gain: number; // <g>
  gainLevel: "HIGH" | "MEDIUM" | "LOW";
  gainLevelText: string;
  isPassed: boolean;
}

export interface PairedTTestResult {
  n: number;
  meanPre: number;
  meanPost: number;
  meanDiff: number;
  sdPre: number;
  sdPost: number;
  sdDiff: number;
  seDiff: number;
  tValue: number;
  df: number;
  pValue: number;
  pValueFormatted: string;
  isSignificant: boolean;
  alpha: number;
  cohensD: number;
  effectSizeLevel: "NEGLIGIBLE" | "SMALL" | "MEDIUM" | "LARGE";
  effectSizeText: string;
  interpretationText: string;
  academicSummaryText: string;
}

export interface PrePostClassAnalytics {
  totalMatchedStudents: number;
  avgPrePercent: number;
  avgPostPercent: number;
  medianPrePercent: number;
  medianPostPercent: number;
  sdPrePercent: number;
  sdPostPercent: number;
  minPrePercent: number;
  maxPrePercent: number;
  minPostPercent: number;
  maxPostPercent: number;
  meanDifference: number;
  classPercentageImprovement: number;
  classAverageGain: number; // Average of individual gains
  hakeClassGain: number; // (<Post%> - <Pre%>) / (100 - <Pre%>)
  hakeClassGainLevelText: string;
  passRate: number;
  highGainCount: number;
  mediumGainCount: number;
  lowGainCount: number;
  studentGains: StudentGainResult[];
  tTest: PairedTTestResult | null;
}

/**
 * Calculates Median of an array of numbers
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return Number(sorted[mid].toFixed(2));
  }
  return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
}

/**
 * Calculates Descriptive Statistics for a set of scores
 */
export function calculateDescriptiveStats(
  scores: number[],
  passingScore: number = 0
): DescriptiveStats {
  const n = scores.length;
  if (n === 0) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      max: 0,
      min: 0,
      sd: 0,
      passedCount: 0,
      failedCount: 0,
      passRate: 0,
    };
  }

  const sum = scores.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;
  const median = calculateMedian(scores);
  const max = Math.max(...scores);
  const min = Math.min(...scores);

  const variance =
    scores.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n > 1 ? n - 1 : 1);
  const sd = Math.sqrt(variance);

  const passedCount = scores.filter((s) => s >= passingScore).length;
  const failedCount = n - passedCount;
  const passRate = (passedCount / n) * 100;

  return {
    count: n,
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    max: Number(max.toFixed(2)),
    min: Number(min.toFixed(2)),
    sd: Number(sd.toFixed(2)),
    passedCount,
    failedCount,
    passRate: Number(passRate.toFixed(1)),
  };
}

/**
 * Log Gamma function approximation
 */
function logGamma(z: number): number {
  const c = [
    57.1562356658629235, -59.5979603554754912, 14.1360979747417471,
    -0.491908960533037465, 0.339946499848118887e-4, 0.465236289270485756e-4,
    -0.983744753048795646e-4, 0.158088703224377344e-3, -0.210264441724104883e-3,
    0.217439618115212643e-3, -0.16431810653676389e-3, 0.844182239838527433e-4,
    -0.261908384015814087e-4, 0.368991826595316234e-5,
  ];
  let sum = 0.999999999999997092;
  const base = z + 4.65;
  for (let i = 0; i < c.length; i++) {
    sum += c[i] / (z + i + 1);
  }
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(base) - base + Math.log(sum);
}

function betacf(a: number, b: number, x: number): number {
  const maxIter = 200;
  const eps = 3.0e-14;
  const qab = a + b;
  const qap = a + 1.0;
  const qam = a - 1.0;
  let c = 1.0;
  let d = 1.0 - (qab * x) / qap;
  if (Math.abs(d) < 1.0e-30) d = 1.0e-30;
  d = 1.0 / d;
  let h = d;

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    const aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < 1.0e-30) d = 1.0e-30;
    c = 1.0 + aa / c;
    if (Math.abs(c) < 1.0e-30) c = 1.0e-30;
    d = 1.0 / d;
    h *= d * c;

    const bb = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1.0 + bb * d;
    if (Math.abs(d) < 1.0e-30) d = 1.0e-30;
    c = 1.0 + bb / c;
    if (Math.abs(c) < 1.0e-30) c = 1.0e-30;
    d = 1.0 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1.0) <= eps) break;
  }
  return h;
}

function incbeta(a: number, b: number, x: number): number {
  if (x <= 0.0) return 0.0;
  if (x >= 1.0) return 1.0;

  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1.0 - x));

  if (x < (a + 1.0) / (a + b + 2.0)) {
    return (bt * betacf(a, b, x)) / a;
  } else {
    return 1.0 - (bt * betacf(b, a, 1.0 - x)) / b;
  }
}

/**
 * Calculates exact two-tailed p-value for Student's t distribution
 */
export function calculateStudentsTPValue(t: number, df: number): number {
  if (df <= 0 || isNaN(t) || isNaN(df)) return 1.0;
  const absT = Math.abs(t);
  if (absT === 0) return 1.0;

  const x = df / (df + absT * absT);
  const p = incbeta(df / 2.0, 0.5, x);
  return Math.max(0, Math.min(1, p));
}

/**
 * Calculates Paired / Dependent Samples t-test and Cohen's d Effect Size
 */
export function calculatePairedTTest(
  preScores: number[],
  postScores: number[]
): PairedTTestResult | null {
  const n = Math.min(preScores.length, postScores.length);
  if (n < 2) return null;

  const meanPre = preScores.reduce((a, b) => a + b, 0) / n;
  const meanPost = postScores.reduce((a, b) => a + b, 0) / n;

  // Pre and Post SDs
  const varPre = preScores.reduce((sum, v) => sum + Math.pow(v - meanPre, 2), 0) / (n - 1);
  const varPost = postScores.reduce((sum, v) => sum + Math.pow(v - meanPost, 2), 0) / (n - 1);
  const sdPre = Math.sqrt(varPre);
  const sdPost = Math.sqrt(varPost);

  // Differences
  const diffs = preScores.slice(0, n).map((pre, i) => postScores[i] - pre);
  const meanDiff = diffs.reduce((a, b) => a + b, 0) / n;

  const sumSqDiff = diffs.reduce((sum, d) => sum + Math.pow(d - meanDiff, 2), 0);
  const sdDiff = Math.sqrt(sumSqDiff / (n - 1));
  const seDiff = sdDiff / Math.sqrt(n);

  let tValue = 0;
  if (seDiff > 0) {
    tValue = meanDiff / seDiff;
  }

  const df = n - 1;
  const pValue = calculateStudentsTPValue(tValue, df);
  const alpha = 0.05;
  const isSignificant = pValue < alpha;

  // Cohen's d for paired samples: d = meanDiff / sdDiff
  const cohensD = sdDiff > 0 ? Number((meanDiff / sdDiff).toFixed(3)) : 0;
  const absD = Math.abs(cohensD);

  let effectSizeLevel: PairedTTestResult["effectSizeLevel"] = "NEGLIGIBLE";
  let effectSizeText = "ขนาดอิทธิพลน้อยมาก (Negligible: |d| < 0.20)";

  if (absD >= 0.8) {
    effectSizeLevel = "LARGE";
    effectSizeText = "ขนาดอิทธิพลระดับใหญ่ / สูงมาก (Large: |d| ≥ 0.80)";
  } else if (absD >= 0.5) {
    effectSizeLevel = "MEDIUM";
    effectSizeText = "ขนาดอิทธิพลระดับปานกลาง (Medium: 0.50 ≤ |d| < 0.80)";
  } else if (absD >= 0.2) {
    effectSizeLevel = "SMALL";
    effectSizeText = "ขนาดอิทธิพลระดับน้อย (Small: 0.20 ≤ |d| < 0.50)";
  }

  const pValueFormatted = pValue < 0.001 ? "p < .001" : `p = ${pValue.toFixed(3)}`;

  let interpretationText = "";
  if (isSignificant) {
    if (meanDiff > 0) {
      interpretationText = `ผลการทดสอบพบว่าคะแนนหลังเรียนสูงกว่าก่อนเรียนอย่างมีนัยสำคัญทางสถิติที่ระดับ .05 (t(${df}) = ${tValue.toFixed(2)}, ${pValueFormatted})`;
    } else {
      interpretationText = `ผลการทดสอบพบว่าคะแนนหลังเรียนต่ำกว่าก่อนเรียนอย่างมีนัยสำคัญทางสถิติที่ระดับ .05 (t(${df}) = ${tValue.toFixed(2)}, ${pValueFormatted})`;
    }
  } else {
    interpretationText = `ไม่พบความแตกต่างของคะแนนก่อนเรียนและหลังเรียนอย่างมีนัยสำคัญทางสถิติที่ระดับ .05 (t(${df}) = ${tValue.toFixed(2)}, ${pValueFormatted})`;
  }

  const academicSummaryText = `จากการวิเคราะห์เปรียบเทียบคะแนนก่อนเรียนและหลังเรียนของกลุ่มตัวอย่างจำนวน ${n} คน พบว่า คะแนนเฉลี่ยก่อนเรียนเท่ากับ ${meanPre.toFixed(2)} (SD = ${sdPre.toFixed(2)}) และคะแนนเฉลี่ยหลังเรียนเท่ากับ ${meanPost.toFixed(2)} (SD = ${sdPost.toFixed(2)}) โดยมีคะแนนเฉลี่ยเพิ่มขึ้น ${meanDiff >= 0 ? "+" : ""}${meanDiff.toFixed(2)} คะแนน ผลการทดสอบทางสถิติ Dependent Samples t-test แสดงค่า t(${df}) = ${tValue.toFixed(2)} (${pValueFormatted}) สรุปได้ว่า ${
    isSignificant
      ? "ผู้เรียนมีผลสัมฤทธิ์ทางการเรียนหลังเรียนสูงกว่าก่อนเรียนอย่างมีนัยสำคัญทางสถิติที่ระดับ .05"
      : "คะแนนก่อนเรียนและหลังเรียนไม่มีความแตกต่างกันอย่างมีนัยสำคัญทางสถิติที่ระดับ .05"
  } และมีขนาดอิทธิพลของนวัตกรรมการจัดการเรียนรู้ (Cohen's d) เท่ากับ ${cohensD} (${effectSizeText})`;

  return {
    n,
    meanPre: Number(meanPre.toFixed(2)),
    meanPost: Number(meanPost.toFixed(2)),
    meanDiff: Number(meanDiff.toFixed(2)),
    sdPre: Number(sdPre.toFixed(2)),
    sdPost: Number(sdPost.toFixed(2)),
    sdDiff: Number(sdDiff.toFixed(2)),
    seDiff: Number(seDiff.toFixed(2)),
    tValue: Number(tValue.toFixed(3)),
    df,
    pValue: Number(pValue.toFixed(4)),
    pValueFormatted,
    isSignificant,
    alpha,
    cohensD,
    effectSizeLevel,
    effectSizeText,
    interpretationText,
    academicSummaryText,
  };
}

/**
 * Calculates Normalized Gain <g> (Hake's Gain) for Pre-test vs Post-test comparison
 */
export function calculateNormalizedGain(
  prePercent: number,
  postPercent: number
): { gain: number; gainLevel: "HIGH" | "MEDIUM" | "LOW"; gainLevelText: string } {
  let gain = 0;

  if (prePercent >= 100) {
    gain = postPercent >= 100 ? 1.0 : 0.0;
  } else {
    gain = (postPercent - prePercent) / (100 - prePercent);
  }

  // Bound gain between -1 and 1
  gain = Math.max(-1, Math.min(1, gain));

  let gainLevel: "HIGH" | "MEDIUM" | "LOW" = "LOW";
  let gainLevelText = "ระดับต่ำ (<g> < 0.30)";

  if (gain >= 0.7) {
    gainLevel = "HIGH";
    gainLevelText = "พัฒนาการระดับสูง (<g> ≥ 0.70)";
  } else if (gain >= 0.3) {
    gainLevel = "MEDIUM";
    gainLevelText = "พัฒนาการระดับปานกลาง (0.30 ≤ <g> < 0.70)";
  } else {
    gainLevel = "LOW";
    gainLevelText = "พัฒนาการระดับต่ำ (<g> < 0.30)";
  }

  return {
    gain: Number(gain.toFixed(3)),
    gainLevel,
    gainLevelText,
  };
}

/**
 * Calculates Percentage Improvement safely
 */
export function calculatePercentageImprovement(pre: number, post: number): number {
  if (pre <= 0) {
    return post > 0 ? 100.0 : 0.0;
  }
  const imp = ((post - pre) / pre) * 100;
  return Number(imp.toFixed(2));
}

/**
 * Calculates Item Analysis (Difficulty p and Discrimination r) for exam questions
 */
export function calculateItemAnalysis(
  questions: Array<{
    id: string;
    questionText: string;
    questionType: string;
    difficulty: string;
    score: number;
  }>,
  attemptsWithAnswers: Array<{
    id: string;
    totalScore: number;
    answers: Array<{
      questionId: string;
      isCorrect: boolean;
    }>;
  }>
): ItemAnalysisResult[] {
  const n = attemptsWithAnswers.length;
  if (n === 0) {
    return questions.map((q) => ({
      questionId: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      difficultyLevel: q.difficulty,
      score: q.score,
      totalExaminees: 0,
      correctCount: 0,
      incorrectCount: 0,
      difficultyIndex: 0,
      difficultyText: "ยังไม่มีผู้เข้าสอบ",
      difficultyQuality: "MODERATE",
      discriminationIndex: 0,
      discriminationText: "ยังไม่มีผู้เข้าสอบ",
      discriminationQuality: "FAIR",
    }));
  }

  // Sort attempts by total score descending
  const sortedAttempts = [...attemptsWithAnswers].sort(
    (a, b) => b.totalScore - a.totalScore
  );

  // Group size (27% for large N, 50% for N < 10)
  const groupFraction = n >= 10 ? 0.27 : 0.5;
  const groupSize = Math.max(1, Math.round(n * groupFraction));

  const highGroup = sortedAttempts.slice(0, groupSize);
  const lowGroup = sortedAttempts.slice(n - groupSize);

  return questions.map((q) => {
    let correctCount = 0;
    let highCorrect = 0;
    let lowCorrect = 0;

    // Count overall correct
    for (const att of sortedAttempts) {
      const ans = att.answers.find((a) => a.questionId === q.id);
      if (ans && ans.isCorrect) {
        correctCount++;
      }
    }

    // High group correct
    for (const att of highGroup) {
      const ans = att.answers.find((a) => a.questionId === q.id);
      if (ans && ans.isCorrect) {
        highCorrect++;
      }
    }

    // Low group correct
    for (const att of lowGroup) {
      const ans = att.answers.find((a) => a.questionId === q.id);
      if (ans && ans.isCorrect) {
        lowCorrect++;
      }
    }

    // Difficulty p: (Rh + Rl) / (Nh + Nl)
    const p = (highCorrect + lowCorrect) / (highGroup.length + lowGroup.length);

    // Discrimination r: (Rh - Rl) / Nh
    const r = (highCorrect - lowCorrect) / highGroup.length;

    // Interpret Difficulty (p)
    let difficultyQuality: ItemAnalysisResult["difficultyQuality"] = "MODERATE";
    let difficultyText = "ความยากง่ายพอเหมาะ (0.40 - 0.60)";

    if (p >= 0.8) {
      difficultyQuality = "VERY_EASY";
      difficultyText = "ง่ายมาก (p ≥ 0.80)";
    } else if (p >= 0.6) {
      difficultyQuality = "EASY";
      difficultyText = "ค่อนข้างง่าย (0.60 - 0.79)";
    } else if (p >= 0.4) {
      difficultyQuality = "MODERATE";
      difficultyText = "ความยากง่ายพอเหมาะ (0.40 - 0.59)";
    } else if (p >= 0.2) {
      difficultyQuality = "HARD";
      difficultyText = "ค่อนข้างยาก (0.20 - 0.39)";
    } else {
      difficultyQuality = "VERY_HARD";
      difficultyText = "ยากมาก (p < 0.20)";
    }

    // Interpret Discrimination (r)
    let discriminationQuality: ItemAnalysisResult["discriminationQuality"] = "GOOD";
    let discriminationText = "อำนาจจำแนกดี (0.30 - 0.39)";

    if (r >= 0.4) {
      discriminationQuality = "VERY_GOOD";
      discriminationText = "อำนาจจำแนกดีมาก (r ≥ 0.40)";
    } else if (r >= 0.3) {
      discriminationQuality = "GOOD";
      discriminationText = "อำนาจจำแนกดี (0.30 - 0.39)";
    } else if (r >= 0.2) {
      discriminationQuality = "FAIR";
      discriminationText = "พอใช้/ควรปรับปรุง (0.20 - 0.29)";
    } else if (r >= 0) {
      discriminationQuality = "POOR";
      discriminationText = "อำนาจจำแนกต่ำ/ควรปรับปรุง (0.00 - 0.19)";
    } else {
      discriminationQuality = "DEFECTICE" as any;
      discriminationText = "จำแนกกลับด้าน/ข้อสอบบกพร่อง (r < 0)";
    }

    return {
      questionId: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      difficultyLevel: q.difficulty,
      score: q.score,
      totalExaminees: n,
      correctCount,
      incorrectCount: n - correctCount,
      difficultyIndex: Number(p.toFixed(2)),
      difficultyText,
      difficultyQuality,
      discriminationIndex: Number(r.toFixed(2)),
      discriminationText,
      discriminationQuality,
    };
  });
}
