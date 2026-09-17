"use client";

import { useState } from "react";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  HelpCircle,
  ChevronRight,
  Download,
  Info,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { DifficultyBadge, QuestionTypeBadge } from "@/components/ui/Badge";
import { ParseResult, ParsedQuestionItem } from "@/lib/parsers/question-parser";

interface FileImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  questionSetId: string;
  onImportSuccess: (savedCount: number) => void;
}

export default function FileImportModal({
  isOpen,
  onClose,
  courseId,
  questionSetId,
  onImportSuccess,
}: FileImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [previewTab, setPreviewTab] = useState<"ALL" | "VALID" | "ERROR">("ALL");

  const resetState = () => {
    setFile(null);
    setIsDragging(false);
    setParsing(false);
    setSubmitting(false);
    setError(null);
    setParseResult(null);
    setPreviewTab("ALL");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile) return;

    const validExts = [".docx", ".xlsx", ".xls", ".csv", ".txt"];
    const lowerName = selectedFile.name.toLowerCase();
    const isValidExt = validExts.some((ext) => lowerName.endsWith(ext));

    if (!isValidExt) {
      setError("รองรับเฉพาะไฟล์นามสกุล .DOCX, .XLSX, .CSV, .TXT เท่านั้น");
      return;
    }

    setError(null);
    setFile(selectedFile);
    setParsing(true);
    setParseResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("mode", "PREVIEW");

      const res = await fetch(
        `/api/courses/${courseId}/question-sets/${questionSetId}/import`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "เกิดข้อผิดพลาดในการอ่านไฟล์");
        setParseResult(null);
      } else {
        setParseResult(data.parseResult);
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ขณะอ่านไฟล์");
    } finally {
      setParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      processFile(droppedFiles[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.validCount === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const validItems = parseResult.items.filter((item) => item.isValid);
      const res = await fetch(
        `/api/courses/${courseId}/question-sets/${questionSetId}/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: validItems }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "เกิดข้อผิดพลาดในการบันทึกข้อสอบ");
        setSubmitting(false);
      } else {
        onImportSuccess(data.savedCount);
        handleClose();
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ขณะบันทึกข้อสอบ");
      setSubmitting(false);
    }
  };

  const filteredItems = parseResult
    ? parseResult.items.filter((item) => {
        if (previewTab === "VALID") return item.isValid;
        if (previewTab === "ERROR") return !item.isValid;
        return true;
      })
    : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="นำเข้าข้อสอบจากไฟล์ (Import Questions)"
      maxWidth="xl"
    >
      <div className="space-y-5">
        {error && <Alert type="error" message={error} />}

        {/* Upload Box (When no parse result or re-uploading) */}
        {!parseResult && (
          <div className="space-y-4">
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                isDragging
                  ? "border-indigo-600 bg-indigo-50/80 scale-[1.01] ring-4 ring-indigo-500/20"
                  : "border-slate-300 hover:border-indigo-400 bg-slate-50/50"
              }`}
            >
              <input
                type="file"
                id="question-file-input"
                accept=".docx,.xlsx,.xls,.csv,.txt"
                onChange={handleFileChange}
                disabled={parsing}
                className="hidden"
              />
              <label
                htmlFor="question-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-3"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition ${
                  isDragging
                    ? "bg-indigo-600 text-white scale-110"
                    : "bg-indigo-50 text-indigo-600"
                }`}>
                  {parsing ? (
                    <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                  ) : (
                    <Upload className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {parsing
                      ? "กำลังประมวลผลและตรวจสอบไฟล์..."
                      : isDragging
                      ? "ปล่อยไฟล์ตรงนี้เพื่อเริ่มนำเข้า..."
                      : "คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่ (Drag & Drop)"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    รองรับไฟล์ <span className="font-semibold text-indigo-600">.DOCX, .XLSX, .CSV, .TXT</span>
                  </p>
                </div>
              </label>

              {/* Display selected file status if parsing */}
              {file && parsing && (
                <div className="mt-4 p-3 bg-white rounded-xl border border-indigo-200 text-xs text-slate-700 flex items-center justify-center gap-2 max-w-sm mx-auto shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                  <span className="font-bold truncate">{file.name}</span>
                  <span className="text-slate-400 shrink-0">({formatFileSize(file.size)})</span>
                </div>
              )}
            </div>

            {/* Guide Info Box */}
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-xs text-slate-700 space-y-2">
              <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-600" /> คำแนะนำรูปแบบไฟล์:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="bg-white p-3 rounded-xl border border-indigo-100/80">
                  <span className="font-bold text-slate-900 block mb-1 text-[11px]">
                    📄 ไฟล์ Word (.DOCX) หรือ Text (.TXT)
                  </span>
                  <pre className="text-[10px] text-slate-600 font-mono bg-slate-50 p-2 rounded-lg overflow-x-auto leading-relaxed">
{`ข้อ 1. HTML ย่อมาจากอะไร
A. Hyper Text Markup Language
B. High Text Machine Language
C. Hyper Tool Markup Language
D. Home Tool Markup Language
เฉลย: A
คำอธิบาย: ภาษาที่ใช้สร้างโครงสร้างหน้าเว็บ`}
                  </pre>
                </div>
                <div className="bg-white p-3 rounded-xl border border-indigo-100/80">
                  <span className="font-bold text-slate-900 block mb-1 text-[11px]">
                    📊 ไฟล์ Excel (.XLSX) หรือ .CSV
                  </span>
                  <p className="text-[11px] text-slate-600 mb-1">
                    กำหนดหัวตาราง (Headers):
                  </p>
                  <p className="text-[10px] font-mono text-indigo-700 bg-slate-50 p-2 rounded-lg leading-relaxed">
                    question, choice_a, choice_b, choice_c, choice_d, correct_answer, explanation, category, difficulty
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Parse Preview Result */}
        {parseResult && (
          <div className="space-y-4">
            {/* Stats Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <p className="text-xs text-slate-500">ผลการอ่านและตรวจสอบไฟล์:</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 truncate max-w-xs">{file?.name}</span>
                  {file && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono">
                      {file.name.split(".").pop()?.toUpperCase()} • {formatFileSize(file.size)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTab("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    previewTab === "ALL"
                      ? "bg-slate-800 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  ทั้งหมด ({parseResult.totalFound})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("VALID")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                    previewTab === "VALID"
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> ผ่าน ({parseResult.validCount})
                </button>
                {parseResult.errorCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setPreviewTab("ERROR")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                      previewTab === "ERROR"
                        ? "bg-rose-600 text-white"
                        : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" /> มีข้อผิดพลาด ({parseResult.errorCount})
                  </button>
                )}
              </div>
            </div>

            {/* Questions Preview List */}
            <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1">
              {filteredItems.map((item) => (
                <div
                  key={item.index}
                  className={`p-4 rounded-xl border text-xs transition ${
                    item.isValid
                      ? "bg-white border-slate-200 hover:border-indigo-300"
                      : "bg-rose-50/50 border-rose-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px]">
                        {item.index}
                      </span>
                      <DifficultyBadge difficulty={item.difficulty} />
                      <QuestionTypeBadge type={item.questionType} />
                      {item.categoryName && (
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px] font-medium">
                          {item.categoryName}
                        </span>
                      )}
                    </div>
                    <div>
                      {item.isValid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมนำเข้า
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 font-semibold bg-rose-100 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3.5 h-3.5" /> ข้อผิดพลาด
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="font-semibold text-slate-900 text-sm mb-2.5">
                    {item.questionText}
                  </p>

                  {/* Errors display if any */}
                  {item.errors.length > 0 && (
                    <div className="mb-3 p-2.5 rounded-lg bg-rose-100/70 border border-rose-200 text-rose-800 text-xs">
                      <p className="font-bold flex items-center gap-1 mb-1">
                        <AlertCircle className="w-3.5 h-3.5" /> ข้อผิดพลาดที่ไม่สามารถนำเข้าได้:
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                        {item.errors.map((err, eIdx) => (
                          <li key={eIdx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Choices list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {item.choices.map((c, cIdx) => (
                      <div
                        key={cIdx}
                        className={`p-2 rounded-lg text-xs flex items-center justify-between ${
                          c.isCorrect
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium"
                            : "bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span className="truncate pr-2">
                          <span className="font-bold mr-1">
                            {String.fromCharCode(65 + cIdx)}.
                          </span>
                          {c.choiceText}
                        </span>
                        {c.isCorrect && (
                          <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded shrink-0">
                            เฉลย
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {item.explanation && (
                    <p className="mt-2 text-[11px] text-slate-500 italic">
                      คำอธิบาย: {item.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Action Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetState}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs transition"
              >
                เลือกไฟล์ใหม่
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={submitting || parseResult.validCount === 0}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังบันทึกข้อมูล...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      ยืนยันนำเข้า ({parseResult.validCount} ข้อที่ผ่าน)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
