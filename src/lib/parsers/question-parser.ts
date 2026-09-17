import * as mammoth from "mammoth";
import * as XLSX from "xlsx";

export interface ParsedChoice {
  choiceText: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface ParsedQuestionItem {
  index: number;
  rawText?: string;
  questionText: string;
  questionType: "MULTIPLE_CHOICE" | "TRUE_FALSE";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  defaultScore: number;
  explanation?: string;
  categoryName?: string;
  choices: ParsedChoice[];
  isValid: boolean;
  errors: string[];
}

export interface ParseResult {
  totalFound: number;
  validCount: number;
  errorCount: number;
  items: ParsedQuestionItem[];
}

// Map Thai letter / Alphabet / Number to 0-based index
export function normalizeChoiceIndex(val: string): number | null {
  if (!val) return null;
  let clean = val.trim().toUpperCase().replace(/^(?:ข้อ\s*)/i, "").trim();
  if (clean.length > 1 && (clean[1] === "." || clean[1] === ")" || clean[1] === ":" || clean[1] === " ")) {
    clean = clean[0];
  }
  if (clean === "A" || clean === "ก" || clean === "1") return 0;
  if (clean === "B" || clean === "ข" || clean === "2") return 1;
  if (clean === "C" || clean === "ค" || clean === "3") return 2;
  if (clean === "D" || clean === "ง" || clean === "4") return 3;
  if (clean === "E" || clean === "จ" || clean === "5") return 4;
  return null;
}

export function normalizeDifficulty(val?: string): "EASY" | "MEDIUM" | "HARD" {
  if (!val) return "MEDIUM";
  const clean = val.trim().toUpperCase();
  if (clean === "EASY" || clean === "ง่าย") return "EASY";
  if (clean === "HARD" || clean === "ยาก") return "HARD";
  return "MEDIUM";
}

export function normalizeQuestionType(val?: string, choicesCount?: number): "MULTIPLE_CHOICE" | "TRUE_FALSE" {
  if (!val) {
    if (choicesCount === 2) return "TRUE_FALSE";
    return "MULTIPLE_CHOICE";
  }
  const clean = val.trim().toUpperCase();
  if (clean === "TRUE_FALSE" || clean === "ถูกผิด" || clean === "TF") return "TRUE_FALSE";
  return "MULTIPLE_CHOICE";
}

/**
 * Parses questions from plain text string (used for DOCX, TXT)
 */
export function parseQuestionsFromText(rawContent: string): ParseResult {
  const lines = rawContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Group lines by question blocks
  // A question block typically starts with "ข้อ" or a number like "1.", "1)", "ข้อ 1."
  const questionHeaderRegex = /^(?:ข้อ\s*)?(\d+)[\.\:\)]\s*(.*)$/i;
  const choiceRegex = /^([A-Ea-eก-จ]|1|2|3|4|5)[\.\:\)]\s*(.*)$/;
  const answerRegex = /^(?:เฉลย|คำตอบ|เฉลยข้อ|Answer|Correct(?:\s*Answer)?)\s*[\:\=\.]?\s*(.*)$/i;
  const explanationRegex = /^(?:คำอธิบาย|เหตุผล|Explanation|Rationale)\s*[\:\=\.]?\s*(.*)$/i;
  const categoryRegex = /^(?:หมวดหมู่|หมวด|เรื่อง|Category)\s*[\:\=\.]?\s*(.*)$/i;
  const difficultyRegex = /^(?:ระดับความยาก|ความยาก|Difficulty)\s*[\:\=\.]?\s*(.*)$/i;
  const scoreRegex = /^(?:คะแนน|น้ำหนัก|Score)\s*[\:\=\.]?\s*(.*)$/i;
  const typeRegex = /^(?:ประเภท|QuestionType|Type)\s*[\:\=\.]?\s*(.*)$/i;

  interface RawBlock {
    index: number;
    lines: string[];
  }

  const blocks: RawBlock[] = [];
  let currentBlock: RawBlock | null = null;
  let autoIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(questionHeaderRegex);

    if (match) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      const parsedNum = parseInt(match[1], 10);
      currentBlock = {
        index: !isNaN(parsedNum) ? parsedNum : autoIndex++,
        lines: [line],
      };
    } else if (currentBlock) {
      currentBlock.lines.push(line);
    } else {
      // Line before any question header, if it looks like a question without number:
      currentBlock = {
        index: autoIndex++,
        lines: [line],
      };
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  const items: ParsedQuestionItem[] = [];

  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    const errors: string[] = [];
    let questionText = "";
    const rawChoices: { label: string; text: string }[] = [];
    let answerLabel = "";
    let explanation = "";
    let categoryName = "";
    let difficulty: "EASY" | "MEDIUM" | "HARD" = "MEDIUM";
    let defaultScore = 1.0;
    let questionType: "MULTIPLE_CHOICE" | "TRUE_FALSE" = "MULTIPLE_CHOICE";

    for (let l = 0; l < block.lines.length; l++) {
      const line = block.lines[l];

      const qMatch = line.match(questionHeaderRegex);
      if (l === 0 && qMatch) {
        questionText = qMatch[2] || line;
        continue;
      } else if (l === 0 && !qMatch) {
        questionText = line;
        continue;
      }

      const ansMatch = line.match(answerRegex);
      if (ansMatch) {
        answerLabel = ansMatch[1].trim();
        continue;
      }

      const expMatch = line.match(explanationRegex);
      if (expMatch) {
        explanation = expMatch[1].trim();
        continue;
      }

      const catMatch = line.match(categoryRegex);
      if (catMatch) {
        categoryName = catMatch[1].trim();
        continue;
      }

      const diffMatch = line.match(difficultyRegex);
      if (diffMatch) {
        difficulty = normalizeDifficulty(diffMatch[1]);
        continue;
      }

      const scoreMatch = line.match(scoreRegex);
      if (scoreMatch) {
        const parsedScore = parseFloat(scoreMatch[1].trim());
        if (!isNaN(parsedScore) && parsedScore > 0) {
          defaultScore = parsedScore;
        }
        continue;
      }

      const typeMatch = line.match(typeRegex);
      if (typeMatch) {
        questionType = normalizeQuestionType(typeMatch[1]);
        continue;
      }

      const cMatch = line.match(choiceRegex);
      if (cMatch) {
        rawChoices.push({
          label: cMatch[1],
          text: cMatch[2].trim(),
        });
        continue;
      }

      // If line is neither choice nor metadata, append to question text or previous choice
      if (rawChoices.length === 0) {
        questionText += " " + line;
      } else {
        rawChoices[rawChoices.length - 1].text += " " + line;
      }
    }

    // Validation
    questionText = questionText.trim();
    if (!questionText) {
      errors.push("ไม่พบข้อความคำถาม / โจทย์");
    }

    if (rawChoices.length < 2) {
      errors.push("ตัวเลือกต้องมีอย่างน้อย 2 ตัวเลือก");
    }

    const normalizedAnswerIndex = normalizeChoiceIndex(answerLabel);
    let matchedCorrectChoice = false;

    const choices: ParsedChoice[] = rawChoices.map((c, idx) => {
      let isCorrect = false;
      if (normalizedAnswerIndex !== null && normalizedAnswerIndex === idx) {
        isCorrect = true;
        matchedCorrectChoice = true;
      } else if (c.label.toUpperCase() === answerLabel.toUpperCase()) {
        isCorrect = true;
        matchedCorrectChoice = true;
      } else if (c.text.toLowerCase() === answerLabel.toLowerCase()) {
        isCorrect = true;
        matchedCorrectChoice = true;
      }

      return {
        choiceText: c.text,
        isCorrect,
        orderIndex: idx,
      };
    });

    if (!matchedCorrectChoice && rawChoices.length >= 2) {
      errors.push(`ไม่พบเฉลยที่ระบุ (${answerLabel || "ไม่ได้ระบุ"}) ในตัวเลือก`);
    }

    // Determine type
    questionType = normalizeQuestionType(questionType, choices.length);

    items.push({
      index: b + 1,
      rawText: block.lines.join("\n"),
      questionText,
      questionType,
      difficulty,
      defaultScore,
      explanation: explanation || undefined,
      categoryName: categoryName || undefined,
      choices,
      isValid: errors.length === 0,
      errors,
    });
  }

  const validCount = items.filter((i) => i.isValid).length;
  return {
    totalFound: items.length,
    validCount,
    errorCount: items.length - validCount,
    items,
  };
}

/**
 * Parses questions from DOCX buffer
 */
export async function parseQuestionsFromDocx(buffer: Buffer): Promise<ParseResult> {
  const result = await mammoth.extractRawText({ buffer });
  return parseQuestionsFromText(result.value);
}

/**
 * Parses questions from XLSX or CSV buffer
 */
export function parseQuestionsFromSpreadsheet(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { totalFound: 0, validCount: 0, errorCount: 0, items: [] };
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  const items: ParsedQuestionItem[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];

    // Helper to find column regardless of casing
    const getVal = (keys: string[]): string => {
      for (const k of Object.keys(row)) {
        const cleanK = k.trim().toLowerCase().replace(/[\s_\-]/g, "");
        for (const target of keys) {
          if (cleanK === target.toLowerCase().replace(/[\s_\-]/g, "")) {
            return String(row[k]).trim();
          }
        }
      }
      return "";
    };

    const questionText = getVal(["question", "questiontext", "โจทย์", "คำถาม", "ข้อ", "ข้อสอบ"]);
    const choiceA = getVal(["choicea", "choice1", "a", "ก", "ตัวเลือก1", "ตัวเลือกก", "ตัวเลือกa"]);
    const choiceB = getVal(["choiceb", "choice2", "b", "ข", "ตัวเลือก2", "ตัวเลือกข", "ตัวเลือกb"]);
    const choiceC = getVal(["choicec", "choice3", "c", "ค", "ตัวเลือก3", "ตัวเลือกค", "ตัวเลือกc"]);
    const choiceD = getVal(["choiced", "choice4", "d", "ง", "ตัวเลือก4", "ตัวเลือกง", "ตัวเลือกd"]);
    const choiceE = getVal(["choicee", "choice5", "e", "จ", "ตัวเลือก5", "ตัวเลือกจ", "ตัวเลือกe"]);

    const correctAnswer = getVal(["correctanswer", "correct", "เฉลย", "answer", "คำตอบ", "key", "เฉลยข้อ"]);
    const explanation = getVal(["explanation", "คำอธิบาย", "เหตุผล", "rationale"]);
    const categoryName = getVal(["category", "หมวดหมู่", "หมวด", "เรื่อง"]);
    const difficultyVal = getVal(["difficulty", "ความยาก", "ระดับความยาก"]);
    const scoreVal = getVal(["score", "คะแนน", "น้ำหนัก"]);
    const typeVal = getVal(["questiontype", "type", "ประเภท"]);

    if (!questionText) {
      errors.push("ไม่พบข้อความคำถามในคอลัมน์ question");
    }

    const rawChoices: string[] = [];
    if (choiceA) rawChoices.push(choiceA);
    if (choiceB) rawChoices.push(choiceB);
    if (choiceC) rawChoices.push(choiceC);
    if (choiceD) rawChoices.push(choiceD);
    if (choiceE) rawChoices.push(choiceE);

    if (rawChoices.length < 2) {
      errors.push("ต้องมีตัวเลือกอย่างน้อย 2 ตัวเลือก (choice_a, choice_b)");
    }

    const normIndex = normalizeChoiceIndex(correctAnswer);
    let matchedCorrect = false;

    const choices: ParsedChoice[] = rawChoices.map((cText, idx) => {
      let isCorrect = false;
      if (normIndex !== null && normIndex === idx) {
        isCorrect = true;
        matchedCorrect = true;
      } else if (cText.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
        isCorrect = true;
        matchedCorrect = true;
      }
      return {
        choiceText: cText,
        isCorrect,
        orderIndex: idx,
      };
    });

    if (!matchedCorrect && rawChoices.length >= 2) {
      errors.push(`ไม่พบเฉลยที่ระบุ ("${correctAnswer}") ตรงกับตัวเลือกใดๆ`);
    }

    let defaultScore = 1.0;
    if (scoreVal) {
      const parsed = parseFloat(scoreVal);
      if (!isNaN(parsed) && parsed > 0) defaultScore = parsed;
    }

    const difficulty = normalizeDifficulty(difficultyVal);
    const questionType = normalizeQuestionType(typeVal, choices.length);

    items.push({
      index: i + 1,
      questionText,
      questionType,
      difficulty,
      defaultScore,
      explanation: explanation || undefined,
      categoryName: categoryName || undefined,
      choices,
      isValid: errors.length === 0,
      errors,
    });
  }

  const validCount = items.filter((i) => i.isValid).length;
  return {
    totalFound: items.length,
    validCount,
    errorCount: items.length - validCount,
    items,
  };
}
