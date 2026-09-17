import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import {
  parseQuestionsFromDocx,
  parseQuestionsFromSpreadsheet,
  parseQuestionsFromText,
  ParseResult,
  ParsedQuestionItem,
} from "@/lib/parsers/question-parser";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; setId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
    }

    const questionSet = await prisma.questionSet.findUnique({
      where: { id: params.setId },
      include: { course: true },
    });

    if (!questionSet || questionSet.courseId !== params.id) {
      return NextResponse.json({ success: false, message: "ไม่พบชุดข้อสอบนี้" }, { status: 404 });
    }

    if (user.role === "TEACHER" && questionSet.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์จัดการชุดข้อสอบนี้" }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") || "";

    // -------------------------------------------------------------
    // CASE 1: File Upload for Preview & Validation (multipart/form-data)
    // -------------------------------------------------------------
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const mode = (formData.get("mode") as string) || "PREVIEW";

      if (!file) {
        return NextResponse.json({ success: false, message: "กรุณาแนบไฟล์ข้อสอบ" }, { status: 400 });
      }

      const fileName = file.name.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      let parseResult: ParseResult;

      if (fileName.endsWith(".docx")) {
        parseResult = await parseQuestionsFromDocx(buffer);
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
        parseResult = parseQuestionsFromSpreadsheet(buffer);
      } else if (fileName.endsWith(".txt")) {
        parseResult = parseQuestionsFromText(buffer.toString("utf-8"));
      } else {
        return NextResponse.json(
          { success: false, message: "รองรับเฉพาะไฟล์ .docx, .xlsx, .csv, .txt เท่านั้น" },
          { status: 400 }
        );
      }

      if (parseResult.totalFound === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "ไม่พบข้อสอบในไฟล์ กรุณาตรวจสอบรูปแบบข้อความตามคู่มือแนะนำ",
            parseResult,
          },
          { status: 400 }
        );
      }

      // If mode is PREVIEW, return parse result without saving to DB
      if (mode === "PREVIEW") {
        return NextResponse.json({
          success: true,
          mode: "PREVIEW",
          fileName: file.name,
          parseResult,
        });
      }

      // If mode is direct CONFIRM (or confirm with uploaded file)
      const validItems = parseResult.items.filter((item) => item.isValid);
      if (validItems.length === 0) {
        return NextResponse.json(
          { success: false, message: "ไม่มีข้อสอบที่ผ่านการตรวจสอบ กรุณาแก้ไขข้อผิดพลาดในไฟล์" },
          { status: 400 }
        );
      }

      const savedCount = await saveValidQuestions(validItems, params.id, params.setId, user.id);

      return NextResponse.json({
        success: true,
        mode: "CONFIRM",
        message: `นำเข้าข้อสอบสำเร็จ ${savedCount} ข้อ`,
        savedCount,
        skippedCount: parseResult.totalFound - savedCount,
      });
    }

    // -------------------------------------------------------------
    // CASE 2: JSON Payload for Confirmed Import (application/json)
    // -------------------------------------------------------------
    const body = await request.json();
    const items = body.items as ParsedQuestionItem[];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "ไม่พบรายการข้อสอบที่ต้องการบันทึก" },
        { status: 400 }
      );
    }

    // Only import valid items
    const validItems = items.filter((item) => item.isValid);
    if (validItems.length === 0) {
      return NextResponse.json(
        { success: false, message: "ไม่มีข้อสอบที่ผ่านการตรวจสอบรูปแบบ" },
        { status: 400 }
      );
    }

    const savedCount = await saveValidQuestions(validItems, params.id, params.setId, user.id);

    return NextResponse.json({
      success: true,
      message: `นำเข้าข้อสอบเข้าสู่ชุดข้อสอบสำเร็จ ${savedCount} ข้อ`,
      savedCount,
    });
  } catch (error: any) {
    console.error("Question Import Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "เกิดข้อผิดพลาดในการประมวลผลไฟล์นำเข้า" },
      { status: 500 }
    );
  }
}

/**
 * Helper to save valid parsed questions into database
 */
async function saveValidQuestions(
  items: ParsedQuestionItem[],
  courseId: string,
  questionSetId: string,
  userId: string
): Promise<number> {
  // Collect unique category names to find or create
  const categoryNames = Array.from(
    new Set(
      items
        .map((i) => i.categoryName?.trim())
        .filter((c): c is string => Boolean(c && c.length > 0))
    )
  );

  const categoryMap = new Map<string, string>();

  for (const catName of categoryNames) {
    let category = await prisma.questionCategory.findFirst({
      where: {
        courseId,
        name: catName,
      },
    });

    if (!category) {
      category = await prisma.questionCategory.create({
        data: {
          courseId,
          name: catName,
          description: "หมวดหมู่สร้างอัตโนมัติจากการนำเข้าไฟล์",
        },
      });
    }
    categoryMap.set(catName.toLowerCase(), category.id);
  }

  // Insert questions and choices in a transaction
  let count = 0;
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const catId = item.categoryName
        ? categoryMap.get(item.categoryName.toLowerCase()) || null
        : null;

      await tx.question.create({
        data: {
          courseId,
          questionSetId,
          categoryId: catId,
          createdById: userId,
          questionText: item.questionText,
          questionType: item.questionType,
          difficulty: item.difficulty,
          defaultScore: item.defaultScore || 1.0,
          explanation: item.explanation || null,
          choices: {
            create: item.choices.map((c, idx) => ({
              choiceText: c.choiceText,
              isCorrect: c.isCorrect,
              orderIndex: idx,
            })),
          },
        },
      });
      count++;
    }
  });

  return count;
}
