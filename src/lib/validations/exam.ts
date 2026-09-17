import { z } from "zod";

export const examSchema = z.object({
  title: z.string().min(1, "กรุณากรอกชื่อชุดแบบทดสอบ").max(200, "ชื่อแบบทดสอบต้องไม่เกิน 200 ตัวอักษร"),
  description: z.string().optional().nullable(),
  examType: z.enum(["PRE_TEST", "POST_TEST", "QUIZ", "MIDTERM", "FINAL"]).default("QUIZ"),
  durationMinutes: z.number().int().min(1, "ระยะเวลาต้องอย่างน้อย 1 นาที").max(360, "ระยะเวลาต้องไม่เกิน 360 นาที").default(60),
  passingScore: z.number().min(0, "เกณฑ์คะแนนผ่านต้องไม่ติดลบ").default(0),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  shuffleQuestions: z.boolean().default(true),
  shuffleChoices: z.boolean().default(true),
  maxAttempts: z.number().int().min(1).default(1),
  showScoreImmediately: z.boolean().default(true),
  allowReview: z.boolean().default(true),
  isPublished: z.boolean().default(false),
});

export const assignQuestionsSchema = z.object({
  questionIds: z.array(z.string()).min(1, "กรุณาเลือกข้อสอบอย่างน้อย 1 ข้อ"),
});

export type ExamInput = z.infer<typeof examSchema>;
