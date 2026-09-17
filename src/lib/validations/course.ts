import { z } from "zod";

export const courseSchema = z.object({
  code: z.string().min(1, "กรุณากรอกรหัสวิชา").max(20, "รหัสวิชาต้องไม่เกิน 20 ตัวอักษร"),
  title: z.string().min(1, "กรุณากรอกชื่อรายวิชา").max(200, "ชื่อวิชาต้องไม่เกิน 200 ตัวอักษร"),
  description: z.string().optional().nullable(),
  academicYear: z.string().optional().nullable(),
  semester: z.number().int().min(1).max(3).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อหมวดหมู่").max(100, "ชื่อหมวดหมู่ต้องไม่เกิน 100 ตัวอักษร"),
  description: z.string().optional().nullable(),
});

export type CourseInput = z.infer<typeof courseSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
