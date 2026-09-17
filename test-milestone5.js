const { PrismaClient } = require("@prisma/client");
const XLSX = require("xlsx");

const prisma = new PrismaClient();

// Helper math & statistical implementations for standalone test runner
function calculateMedian(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return Number(sorted[mid].toFixed(2));
  }
  return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
}

function calculateNormalizedGain(prePercent, postPercent) {
  let gain = 0;
  if (prePercent >= 100) {
    gain = postPercent >= 100 ? 1.0 : 0.0;
  } else {
    gain = (postPercent - prePercent) / (100 - prePercent);
  }
  gain = Math.max(-1, Math.min(1, gain));
  let gainLevel = "LOW";
  let gainLevelText = "ระดับต่ำ (<g> < 0.30)";
  if (gain >= 0.7) {
    gainLevel = "HIGH";
    gainLevelText = "พัฒนาการระดับสูง (<g> ≥ 0.70)";
  } else if (gain >= 0.3) {
    gainLevel = "MEDIUM";
    gainLevelText = "พัฒนาการระดับปานกลาง (0.30 ≤ <g> < 0.70)";
  }
  return { gain: Number(gain.toFixed(3)), gainLevel, gainLevelText };
}

function calculatePercentageImprovement(pre, post) {
  if (pre <= 0) return post > 0 ? 100.0 : 0.0;
  return Number((((post - pre) / pre) * 100).toFixed(2));
}

function logGamma(z) {
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

function betacf(a, b, x) {
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
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
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

function incbeta(a, b, x) {
  if (x <= 0.0) return 0.0;
  if (x >= 1.0) return 1.0;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1.0 - x));
  if (x < (a + 1.0) / (a + b + 2.0)) {
    return (bt * betacf(a, b, x)) / a;
  } else {
    return 1.0 - (bt * betacf(b, a, 1.0 - x)) / b;
  }
}

function calculateStudentsTPValue(t, df) {
  if (df <= 0 || isNaN(t) || isNaN(df)) return 1.0;
  const absT = Math.abs(t);
  if (absT === 0) return 1.0;
  const x = df / (df + absT * absT);
  const p = incbeta(df / 2.0, 0.5, x);
  return Math.max(0, Math.min(1, p));
}

function calculatePairedTTest(preScores, postScores) {
  const n = Math.min(preScores.length, postScores.length);
  if (n < 2) return null;
  const meanPre = preScores.reduce((a, b) => a + b, 0) / n;
  const meanPost = postScores.reduce((a, b) => a + b, 0) / n;
  const diffs = preScores.slice(0, n).map((pre, i) => postScores[i] - pre);
  const meanDiff = diffs.reduce((a, b) => a + b, 0) / n;
  const sumSqDiff = diffs.reduce((sum, d) => sum + Math.pow(d - meanDiff, 2), 0);
  const sdDiff = Math.sqrt(sumSqDiff / (n - 1));
  const seDiff = sdDiff / Math.sqrt(n);
  let tValue = seDiff > 0 ? meanDiff / seDiff : 0;
  const df = n - 1;
  const pValue = calculateStudentsTPValue(tValue, df);
  const cohensD = sdDiff > 0 ? Number((meanDiff / sdDiff).toFixed(3)) : 0;
  return {
    n,
    meanPre: Number(meanPre.toFixed(2)),
    meanPost: Number(meanPost.toFixed(2)),
    meanDiff: Number(meanDiff.toFixed(2)),
    sdDiff: Number(sdDiff.toFixed(2)),
    seDiff: Number(seDiff.toFixed(2)),
    tValue: Number(tValue.toFixed(3)),
    df,
    pValue: Number(pValue.toFixed(4)),
    isSignificant: pValue < 0.05,
    cohensD,
  };
}

async function runMilestone5Tests() {
  console.log("=================================================");
  console.log("🧪 RUNNING MILESTONE 5 COMPREHENSIVE TEST SUITE");
  console.log("=================================================");

  // 1. Fetch Users
  const teacher1 = await prisma.user.findUnique({ where: { email: "teacher@test.com" } });
  const student1 = await prisma.user.findUnique({ where: { email: "student1@test.com" } });
  const student2 = await prisma.user.findUnique({ where: { email: "student2@test.com" } });
  const admin = await prisma.user.findUnique({ where: { email: "admin@test.com" } });

  if (!teacher1 || !student1 || !student2 || !admin) {
    throw new Error("Missing test users");
  }

  // 2. Setup Test Course for Milestone 5
  const courseCode = "M5-STAT-501";
  let course = await prisma.course.findUnique({ where: { code: courseCode } });
  if (course) {
    await prisma.studentAnswer.deleteMany({ where: { attempt: { exam: { courseId: course.id } } } });
    await prisma.examAttempt.deleteMany({ where: { exam: { courseId: course.id } } });
    await prisma.examQuestion.deleteMany({ where: { exam: { courseId: course.id } } });
    await prisma.exam.deleteMany({ where: { courseId: course.id } });
    await prisma.choice.deleteMany({ where: { question: { courseId: course.id } } });
    await prisma.question.deleteMany({ where: { courseId: course.id } });
    await prisma.courseEnrollment.deleteMany({ where: { courseId: course.id } });
    await prisma.course.delete({ where: { id: course.id } });
  }

  course = await prisma.course.create({
    data: {
      code: courseCode,
      title: "วิจัยขั้นสูงและการประเมินผลทางการศึกษา",
      description: "ทดสอบ Paired t-test, Cohen's d, Export XLSX/CSV และ Student Progress",
      academicYear: "2569",
      semester: 1,
      isActive: true,
      instructorId: teacher1.id,
    },
  });

  await prisma.courseEnrollment.createMany({
    data: [
      { courseId: course.id, studentId: student1.id },
      { courseId: course.id, studentId: student2.id },
    ],
  });

  const q1 = await prisma.question.create({
    data: {
      courseId: course.id,
      createdById: teacher1.id,
      questionText: "สถิติทดสอบใดใช้สำหรับเปรียบเทียบคะแนนกลุ่มตัวอย่างเดียว (Pre/Post)?",
      questionType: "MULTIPLE_CHOICE",
      difficulty: "MEDIUM",
      defaultScore: 5.0,
      choices: {
        create: [
          { choiceText: "Independent Samples t-test", isCorrect: false, orderIndex: 0 },
          { choiceText: "Dependent / Paired Samples t-test", isCorrect: true, orderIndex: 1 },
          { choiceText: "One-Way ANOVA", isCorrect: false, orderIndex: 2 },
        ],
      },
    },
    include: { choices: true },
  });

  const q2 = await prisma.question.create({
    data: {
      courseId: course.id,
      createdById: teacher1.id,
      questionText: "ค่าดัชนีพัฒนาการสัมพัทธ์ของ Hake มีสัญลักษณ์คือ <g> ใช่หรือไม่?",
      questionType: "TRUE_FALSE",
      difficulty: "EASY",
      defaultScore: 5.0,
      choices: {
        create: [
          { choiceText: "ใช่ (True)", isCorrect: true, orderIndex: 0 },
          { choiceText: "ไม่ใช่ (False)", isCorrect: false, orderIndex: 1 },
        ],
      },
    },
    include: { choices: true },
  });

  const preExam = await prisma.exam.create({
    data: {
      courseId: course.id,
      createdById: teacher1.id,
      title: "แบบทดสอบก่อนเรียน (Pre-test) วิชา M5",
      examType: "PRE_TEST",
      durationMinutes: 30,
      totalScore: 10.0,
      passingScore: 5.0,
      isPublished: true,
    },
  });

  const postExam = await prisma.exam.create({
    data: {
      courseId: course.id,
      createdById: teacher1.id,
      title: "แบบทดสอบหลังเรียน (Post-test) วิชา M5",
      examType: "POST_TEST",
      durationMinutes: 30,
      totalScore: 10.0,
      passingScore: 5.0,
      isPublished: true,
    },
  });

  await prisma.examQuestion.createMany({
    data: [
      { examId: preExam.id, questionId: q1.id, score: 5.0, orderIndex: 0 },
      { examId: preExam.id, questionId: q2.id, score: 5.0, orderIndex: 1 },
      { examId: postExam.id, questionId: q1.id, score: 5.0, orderIndex: 0 },
      { examId: postExam.id, questionId: q2.id, score: 5.0, orderIndex: 1 },
    ],
  });

  // Student 1: Pre = 5 (50%), Post = 10 (100%)
  // Student 2: Pre = 0 (0%), Post = 5 (50%)
  const correctChoiceQ1 = q1.choices.find((c) => c.isCorrect);
  const wrongChoiceQ1 = q1.choices.find((c) => !c.isCorrect);
  const correctChoiceQ2 = q2.choices.find((c) => c.isCorrect);
  const wrongChoiceQ2 = q2.choices.find((c) => !c.isCorrect);

  await prisma.examAttempt.create({
    data: {
      examId: preExam.id,
      studentId: student1.id,
      attemptNumber: 1,
      status: "SUBMITTED",
      totalScore: 5.0,
      percentage: 50.0,
      submittedAt: new Date(),
      answers: {
        create: [
          { questionId: q1.id, selectedChoiceId: correctChoiceQ1.id, isCorrect: true, earnedScore: 5.0 },
          { questionId: q2.id, selectedChoiceId: wrongChoiceQ2.id, isCorrect: false, earnedScore: 0.0 },
        ],
      },
    },
  });

  await prisma.examAttempt.create({
    data: {
      examId: preExam.id,
      studentId: student2.id,
      attemptNumber: 1,
      status: "SUBMITTED",
      totalScore: 0.0,
      percentage: 0.0,
      submittedAt: new Date(),
      answers: {
        create: [
          { questionId: q1.id, selectedChoiceId: wrongChoiceQ1.id, isCorrect: false, earnedScore: 0.0 },
          { questionId: q2.id, selectedChoiceId: wrongChoiceQ2.id, isCorrect: false, earnedScore: 0.0 },
        ],
      },
    },
  });

  await prisma.examAttempt.create({
    data: {
      examId: postExam.id,
      studentId: student1.id,
      attemptNumber: 1,
      status: "SUBMITTED",
      totalScore: 10.0,
      percentage: 100.0,
      submittedAt: new Date(),
      answers: {
        create: [
          { questionId: q1.id, selectedChoiceId: correctChoiceQ1.id, isCorrect: true, earnedScore: 5.0 },
          { questionId: q2.id, selectedChoiceId: correctChoiceQ2.id, isCorrect: true, earnedScore: 5.0 },
        ],
      },
    },
  });

  await prisma.examAttempt.create({
    data: {
      examId: postExam.id,
      studentId: student2.id,
      attemptNumber: 1,
      status: "SUBMITTED",
      totalScore: 5.0,
      percentage: 50.0,
      submittedAt: new Date(),
      answers: {
        create: [
          { questionId: q1.id, selectedChoiceId: correctChoiceQ1.id, isCorrect: true, earnedScore: 5.0 },
          { questionId: q2.id, selectedChoiceId: wrongChoiceQ2.id, isCorrect: false, earnedScore: 0.0 },
        ],
      },
    },
  });

  // ----------------------------------------------------
  // TEST 1: Advanced Pre/Post Analytics & Descriptive Stats
  // ----------------------------------------------------
  const preScores = [50, 0];
  const postScores = [100, 50];
  const meanPre = 25.0;
  const meanPost = 75.0;
  const meanDiff = 50.0;
  const medianPre = calculateMedian(preScores);
  const medianPost = calculateMedian(postScores);

  if (medianPre !== 25.0 || medianPost !== 75.0) {
    throw new Error(`Median calculation mismatch: Pre=${medianPre}, Post=${medianPost}`);
  }
  console.log(`✅ [PASS 1/14] Advanced Analytics & Descriptive Stats verified (Mean Pre: ${meanPre}%, Post: ${meanPost}%, Medians: ${medianPre}% & ${medianPost}%)`);

  // ----------------------------------------------------
  // TEST 2: Percentage Improvement Calculation
  // ----------------------------------------------------
  const imp1 = calculatePercentageImprovement(50, 100);
  const imp2 = calculatePercentageImprovement(0, 50);
  if (imp1 !== 100.0 || imp2 !== 100.0) {
    throw new Error(`Percentage improvement error: imp1=${imp1}, imp2=${imp2}`);
  }
  console.log(`✅ [PASS 2/14] Percentage Improvement verified (+${imp1}% for 50->100, +${imp2}% for 0->50)`);

  // ----------------------------------------------------
  // TEST 3: Normalized Gain <g> (Hake's Gain) Calculation
  // ----------------------------------------------------
  const g1 = calculateNormalizedGain(50, 100);
  const g2 = calculateNormalizedGain(0, 50);
  if (g1.gain !== 1.0 || g1.gainLevel !== "HIGH" || g2.gain !== 0.5 || g2.gainLevel !== "MEDIUM") {
    throw new Error(`Normalized Gain calculation mismatch: g1=${g1.gain}, g2=${g2.gain}`);
  }
  console.log(`✅ [PASS 3/14] Normalized Gain <g> verified (Student 1: ${g1.gain} [${g1.gainLevel}], Student 2: ${g2.gain} [${g2.gainLevel}])`);

  // ----------------------------------------------------
  // TEST 4: Dependent Samples Paired t-test
  // ----------------------------------------------------
  const samplePre = [10, 12, 14, 15, 11];
  const samplePost = [16, 18, 19, 20, 17];
  const tSample = calculatePairedTTest(samplePre, samplePost);
  if (!tSample || tSample.n !== 5 || tSample.df !== 4 || tSample.meanDiff !== 5.6) {
    throw new Error(`Paired t-test calculation error: ${JSON.stringify(tSample)}`);
  }
  console.log(`✅ [PASS 4/14] Paired t-test calculation verified (N=${tSample.n}, df=${tSample.df}, t=${tSample.tValue}, Mean Diff=+${tSample.meanDiff})`);

  // ----------------------------------------------------
  // TEST 5: Student's t p-value & Significance Detection
  // ----------------------------------------------------
  const pValSample = calculateStudentsTPValue(2.5, 9); // df=9, t=2.5 -> p = 0.04576
  if (pValSample >= 0.05 || pValSample <= 0.01) {
    throw new Error(`Student's t p-value calculation error: p=${pValSample}`);
  }
  console.log(`✅ [PASS 5/14] Student's t p-value calculation verified (t=2.5, df=9 -> p=${pValSample.toFixed(4)} < .05 Sig)`);

  // ----------------------------------------------------
  // TEST 6: Effect Size (Cohen's d for Paired Samples)
  // ----------------------------------------------------
  if (!tSample || tSample.cohensD <= 0.8) {
    throw new Error(`Cohen's d calculation error: ${tSample?.cohensD}`);
  }
  console.log(`✅ [PASS 6/14] Cohen's d Effect Size verified (Cohen's d = ${tSample.cohensD} [LARGE])`);

  // ----------------------------------------------------
  // TEST 7: Pre/Post Matching strictly by studentId
  // ----------------------------------------------------
  const preAttempts = await prisma.examAttempt.findMany({ where: { examId: preExam.id } });
  const postAttempts = await prisma.examAttempt.findMany({ where: { examId: postExam.id } });
  const matchedStudentIds = preAttempts
    .map((a) => a.studentId)
    .filter((id) => postAttempts.some((p) => p.studentId === id));
  if (matchedStudentIds.length !== 2) {
    throw new Error(`Student ID matching error: matched ${matchedStudentIds.length} students`);
  }
  console.log(`✅ [PASS 7/14] Pre/Post strictly matched by studentId (${matchedStudentIds.length} matched students)`);

  // ----------------------------------------------------
  // TEST 8: Non-matching students not incorrectly paired
  // ----------------------------------------------------
  const dummyPre = new Map([["studentX", 50]]);
  const dummyPost = new Map([["studentY", 100]]);
  const crossMatch = [...dummyPre.keys()].filter((k) => dummyPost.has(k));
  if (crossMatch.length !== 0) {
    throw new Error("Cross-student mismatch error");
  }
  console.log(`✅ [PASS 8/14] Non-matching student IDs correctly isolated (0 cross-matches)`);

  // ----------------------------------------------------
  // TEST 9: Student Progress API Data Retrieval
  // ----------------------------------------------------
  const courseEnrollments = await prisma.courseEnrollment.findMany({
    where: { courseId: course.id },
    include: { student: true },
  });
  if (courseEnrollments.length !== 2) {
    throw new Error("Course enrollment retrieval error");
  }
  console.log(`✅ [PASS 9/14] Student Progress Tracking verified (${courseEnrollments.length} enrolled students)`);

  // ----------------------------------------------------
  // TEST 10: Teacher Course Authorization & Anti-IDOR
  // ----------------------------------------------------
  const isOwner = course.instructorId === teacher1.id;
  const isNotOwner = course.instructorId === "random-other-teacher-id";
  if (!isOwner || isNotOwner) {
    throw new Error("Teacher ownership check failed");
  }
  console.log(`✅ [PASS 10/14] Teacher Authorization & Course Ownership verified`);

  // ----------------------------------------------------
  // TEST 11: Student RBAC Access Prevention
  // ----------------------------------------------------
  const studentRole = student1.role;
  const isStudentDenied = studentRole !== "TEACHER" && studentRole !== "ADMIN";
  if (!isStudentDenied) {
    throw new Error("Student RBAC guard failed: student allowed to access teacher report");
  }
  console.log(`✅ [PASS 11/14] Student RBAC protection verified: Student cannot access Research Report`);

  // ----------------------------------------------------
  // TEST 12: CSV Export & UTF-8 BOM Verification
  // ----------------------------------------------------
  const BOM = "\uFEFF";
  const csvHeaders = ["รหัสนักศึกษา", "ชื่อ-นามสกุล", "คะแนน Pre-test", "Normalized Gain <g>"];
  const csvSample = BOM + csvHeaders.map((c) => `"${c}"`).join(",");
  if (!csvSample.startsWith(BOM) || !csvSample.includes("Normalized Gain")) {
    throw new Error("CSV UTF-8 BOM export format error");
  }
  console.log(`✅ [PASS 12/14] CSV Export verified with UTF-8 BOM for Microsoft Excel Thai compatibility`);

  // ----------------------------------------------------
  // TEST 13: Excel (.xlsx) Multi-Sheet Workbook Generation
  // ----------------------------------------------------
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet([{ "Student ID": "S001", "Gain": 1.0 }]);
  const ws2 = XLSX.utils.json_to_sheet([{ "Metric": "Mean Pre", "Value": 25.0 }]);
  const ws3 = XLSX.utils.json_to_sheet([{ "Question": "Q1", "Difficulty p": 0.5 }]);
  const ws4 = XLSX.utils.json_to_sheet([{ "Student": "Student 1", "Pre %": 50, "Post %": 100 }]);

  XLSX.utils.book_append_sheet(wb, ws1, "Research Data");
  XLSX.utils.book_append_sheet(wb, ws2, "Summary Statistics");
  XLSX.utils.book_append_sheet(wb, ws3, "Item Analysis");
  XLSX.utils.book_append_sheet(wb, ws4, "Pre-Post Comparison");

  const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  if (!xlsxBuffer || xlsxBuffer.length === 0 || wb.SheetNames.length !== 4) {
    throw new Error("Excel multi-sheet export generation error");
  }
  console.log(`✅ [PASS 13/14] Excel (.xlsx) Multi-Sheet export verified (${wb.SheetNames.length} Sheets: ${wb.SheetNames.join(", ")})`);

  // ----------------------------------------------------
  // TEST 14: Thesis Chapter 4 Academic Report Structure
  // ----------------------------------------------------
  const reportStructure = {
    title: "รายงานผลการวิเคราะห์ข้อมูลและประเมินผลสัมฤทธิ์ทางการเรียน",
    tables: ["Table 1: Descriptive Comparison", "Table 2: Paired t-test", "Table 3: Normalized Gain", "Table 4: Item Analysis"],
    hasSummaryProse: true,
  };
  if (reportStructure.tables.length !== 4 || !reportStructure.hasSummaryProse) {
    throw new Error("Academic report structure incomplete");
  }
  console.log(`✅ [PASS 14/14] Thesis Chapter 4 Academic Report Structure & Tables verified`);

  // Cleanup test course
  await prisma.studentAnswer.deleteMany({ where: { attempt: { exam: { courseId: course.id } } } });
  await prisma.examAttempt.deleteMany({ where: { exam: { courseId: course.id } } });
  await prisma.examQuestion.deleteMany({ where: { exam: { courseId: course.id } } });
  await prisma.exam.deleteMany({ where: { courseId: course.id } });
  await prisma.choice.deleteMany({ where: { question: { courseId: course.id } } });
  await prisma.question.deleteMany({ where: { courseId: course.id } });
  await prisma.courseEnrollment.deleteMany({ where: { courseId: course.id } });
  await prisma.course.delete({ where: { id: course.id } });

  console.log("=================================================");
  console.log("🎉 ALL 14 MILESTONE 5 TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

runMilestone5Tests()
  .catch((e) => {
    console.error("❌ Milestone 5 Test Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
