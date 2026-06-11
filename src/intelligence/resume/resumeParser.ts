import * as pdfjs from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import mammoth from "mammoth/mammoth.browser";
import type { LlmInsight } from "../../shared/types";

export type ResumeFileKind = "pdf" | "docx" | "text";

export type ParsedResume = {
  fileName: string;
  fileSize: number;
  mimeType: string;
  kind: ResumeFileKind;
  text: string;
  charCount: number;
  wordCount: number;
  pageCount?: number;
  warnings: string[];
  parsedAt: string;
};

const PLAIN_TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/x-markdown",
  "application/json"
]);

const PLAIN_TEXT_EXTENSIONS = new Set([".txt", ".md", ".markdown", ".json", ".text", ".log"]);
const DOCX_EXTENSIONS = new Set([".docx"]);
const PDF_EXTENSIONS = new Set([".pdf"]);

export const MAX_RESUME_BYTES = 8 * 1024 * 1024;
export const MAX_RESUME_CHARS = 24_000;

let workerConfigured = false;

function ensurePdfWorker(): void {
  if (workerConfigured) {
    return;
  }
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  workerConfigured = true;
}

function detectKind(file: File): ResumeFileKind | null {
  const name = file.name.toLowerCase();
  const extension = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  if (file.type === "application/pdf" || PDF_EXTENSIONS.has(extension)) {
    return "pdf";
  }
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/zip" ||
    DOCX_EXTENSIONS.has(extension)
  ) {
    return "docx";
  }
  if (file.type.startsWith("text/") || PLAIN_TEXT_TYPES.has(file.type) || PLAIN_TEXT_EXTENSIONS.has(extension)) {
    return "text";
  }
  return null;
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function countWords(text: string): number {
  const matches = text.match(/[\p{L}\p{N}+#.-]+/gu);
  return matches ? matches.length : 0;
}

function trimForPrompt(text: string): string {
  if (text.length <= MAX_RESUME_CHARS) {
    return text;
  }
  return `${text.slice(0, MAX_RESUME_CHARS)}\n\n[...resume truncated for prompt size...]`;
}

async function parsePdf(file: File): Promise<{ text: string; pageCount: number; warnings: string[] }> {
  ensurePdfWorker();
  const buffer = await file.arrayBuffer();
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    disableAutoFetch: true,
    disableStream: true
  });

  const document = await task.promise;
  const warnings: string[] = [];
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .filter((value) => Boolean(value));
    if (strings.length === 0) {
      warnings.push(`Page ${pageNumber} had no extractable text (likely scanned image).`);
    }
    pageTexts.push(strings.join(" "));
    page.cleanup();
  }

  return {
    text: pageTexts.join("\n\n"),
    pageCount: document.numPages,
    warnings
  };
}

async function parseDocx(file: File): Promise<{ text: string; warnings: string[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return {
    text: result.value,
    warnings: result.messages
      .filter((message) => message.type === "warning" && Boolean(message.message))
      .map((message) => message.message ?? "Unknown DOCX warning.")
  };
}

async function parseText(file: File): Promise<{ text: string; warnings: string[] }> {
  const text = await file.text();
  return { text, warnings: [] };
}

export function assertResumeUsable(parsed: ParsedResume): void {
  if (parsed.charCount < 80) {
    throw new Error("Resume text is too short. Upload a complete resume with at least a few sentences.");
  }
  if (parsed.wordCount < 20) {
    throw new Error("Resume text looks empty after parsing. Try a different file (PDF, DOCX, or plain text).");
  }
}

export async function parseResumeFile(file: File): Promise<ParsedResume> {
  if (file.size === 0) {
    throw new Error("This file is empty.");
  }
  if (file.size > MAX_RESUME_BYTES) {
    throw new Error(`File is too large (${Math.round(file.size / 1024)} KB). Max is ${Math.round(MAX_RESUME_BYTES / 1024)} KB.`);
  }

  const kind = detectKind(file);
  if (!kind) {
    throw new Error("Unsupported file type. Use PDF, DOCX, TXT, or Markdown.");
  }

  let rawText = "";
  let pageCount: number | undefined;
  let warnings: string[] = [];

  if (kind === "pdf") {
    const parsed = await parsePdf(file);
    rawText = parsed.text;
    pageCount = parsed.pageCount;
    warnings = parsed.warnings;
  } else if (kind === "docx") {
    const parsed = await parseDocx(file);
    rawText = parsed.text;
    warnings = parsed.warnings;
  } else {
    const parsed = await parseText(file);
    rawText = parsed.text;
  }

  const normalized = normalizeWhitespace(rawText);
  if (!normalized) {
    throw new Error("Could not extract any readable text from the file. If this is a scanned PDF, run OCR first.");
  }

  const wordCount = countWords(normalized);
  const parsedResume: ParsedResume = {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || "application/octet-stream",
    kind,
    text: normalized,
    charCount: normalized.length,
    wordCount,
    pageCount,
    warnings,
    parsedAt: new Date().toISOString()
  };

  assertResumeUsable(parsedResume);
  return parsedResume;
}

export function resumeToPromptPayload(parsed: ParsedResume): { name: string; text: string } {
  return {
    name: parsed.fileName,
    text: trimForPrompt(parsed.text)
  };
}

export function summarizeResume(parsed: Pick<ParsedResume, "fileName" | "fileSize" | "pageCount" | "wordCount">): string {
  const fileSummary = `${parsed.fileName} (${formatBytes(parsed.fileSize)}${parsed.pageCount ? `, ${parsed.pageCount} pages` : ""})`;
  return `${fileSummary} - ${parsed.wordCount} words parsed`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Re-export type for callers that want to type their prompt output.
export type OutreachInsight = LlmInsight;
