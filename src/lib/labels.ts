export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  TEACHER: "อาจารย์ผู้สอน",
  STUDENT: "นักศึกษา",
};

export const EXAM_TYPE_LABELS: Record<string, string> = {
  PRE_TEST: "แบบทดสอบก่อนเรียน",
  POST_TEST: "แบบทดสอบหลังเรียน",
  QUIZ: "แบบทดสอบย่อย",
  MIDTERM: "สอบกลางภาค",
  FINAL: "สอบปลายภาค",
};

export const ATTEMPT_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "ส่งแล้ว",
  IN_PROGRESS: "กำลังทำ",
  TIMED_OUT: "หมดเวลา",
  CANCELLED: "ยกเลิก",
};

export function roleLabel(role?: string | null) {
  if (!role) return "-";
  return ROLE_LABELS[role] || role;
}

export function examTypeLabel(examType?: string | null) {
  if (!examType) return "-";
  return EXAM_TYPE_LABELS[examType] || examType;
}

export function attemptStatusLabel(status?: string | null) {
  if (!status) return "-";
  return ATTEMPT_STATUS_LABELS[status] || status;
}

export function formatAcademicTerm(
  year?: string | null,
  semester?: number | string | null
) {
  const y = year?.toString().trim();
  const s =
    semester === 0 || semester === "0" || semester
      ? String(semester)
      : "";
  if (!y && !s) return "-";
  if (y && s) return `ปีการศึกษา ${y} / ภาคเรียนที่ ${s}`;
  if (y) return `ปีการศึกษา ${y}`;
  return `ภาคเรียนที่ ${s}`;
}

export function currentBuddhistYear() {
  return String(new Date().getFullYear() + 543);
}

export type ExamWindowState = "UPCOMING" | "OPEN" | "CLOSED";

export function getExamWindowState(
  exam: { startTime?: Date | string | null; endTime?: Date | string | null },
  now: Date = new Date()
): ExamWindowState {
  if (exam.startTime && now < new Date(exam.startTime)) return "UPCOMING";
  if (exam.endTime && now > new Date(exam.endTime)) return "CLOSED";
  return "OPEN";
}

export function examWindowLabel(state: ExamWindowState) {
  if (state === "UPCOMING") return "ยังไม่เปิดสอบ";
  if (state === "CLOSED") return "ปิดรับส่งแล้ว";
  return "เปิดสอบอยู่";
}

export function isSubmittedAttempt(status?: string | null) {
  return status === "SUBMITTED" || status === "TIMED_OUT";
}
