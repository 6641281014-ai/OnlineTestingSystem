import { z } from "zod";

export const choiceInputSchema = z.object({
  id: z.string().optional(),
  choiceText: z.string().min(1, "กรุณากรอกข้อความตัวเลือก"),
  imageUrl: z.string().optional().nullable(),
  isCorrect: z.boolean().default(false),
  orderIndex: z.number().int().default(0),
});

export const questionInputSchema = z
  .object({
    categoryId: z.string().optional().nullable(),
    questionText: z.string().min(1, "กรุณากรอกโจทย์คำถาม"),
    questionType: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE"]).default("MULTIPLE_CHOICE"),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
    defaultScore: z.number().positive("คะแนนต้องมากกว่า 0").default(1.0),
    imageUrl: z.string().optional().nullable(),
    explanation: z.string().optional().nullable(),
    choices: z.array(choiceInputSchema).min(2, "ต้องมีตัวเลือกอย่างน้อย 2 ตัวเลือก"),
  })
  .refine(
    (data) => {
      const correctCount = data.choices.filter((c) => c.isCorrect).length;
      return correctCount === 1;
    },
    {
      message: "ต้องกำหนดคำตอบที่ถูกต้องให้มีเพียง 1 ตัวเลือกเท่านั้น",
      path: ["choices"],
    }
  );

export type ChoiceInput = z.infer<typeof choiceInputSchema>;
export type QuestionInput = z.infer<typeof questionInputSchema>;
