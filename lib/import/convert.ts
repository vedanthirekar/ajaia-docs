import { generateJSON } from "@tiptap/html/server";
import mammoth from "mammoth";
import { marked } from "marked";
import type { DocContent } from "../db/schema";
import { editorExtensions } from "../editor/extensions";
import { AppError } from "../errors";
import { MAX_CONTENT_CHARS } from "../validation";

export const MAX_IMPORT_BYTES = 4 * 1024 * 1024;
export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx"] as const;
type Ext = (typeof SUPPORTED_EXTENSIONS)[number];

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function splitName(name: string): { base: string; ext: string } {
  const i = name.lastIndexOf(".");
  if (i < 0) return { base: name, ext: "" };
  return { base: name.slice(0, i), ext: name.slice(i).toLowerCase() };
}

function txtToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

async function toHtml(ext: Ext, bytes: Buffer): Promise<string> {
  switch (ext) {
    case ".txt":
      return txtToHtml(bytes.toString("utf8"));
    case ".md":
      return marked.parse(bytes.toString("utf8"), { async: false });
    case ".docx": {
      try {
        const { value } = await mammoth.convertToHtml({ buffer: bytes });
        return value;
      } catch {
        throw new AppError("UNPARSEABLE_FILE", "This .docx file couldn't be read. Is it a valid Word document?");
      }
    }
  }
}

function hasText(node: { text?: string; content?: unknown[] }): boolean {
  if (node.text?.trim()) return true;
  return (node.content ?? []).some((c) => hasText(c as { text?: string; content?: unknown[] }));
}

/** Convert an uploaded .txt / .md / .docx file into a new document's title + TipTap JSON. */
export async function fileToDoc(name: string, bytes: Buffer): Promise<{ title: string; content: DocContent }> {
  const { base, ext } = splitName(name);
  if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new AppError("UNSUPPORTED_FILE", "Unsupported file type. Supported: .txt, .md, .docx");
  }
  if (bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new AppError("FILE_TOO_LARGE", "File is too large (max 4 MB)");
  }

  const html = await toHtml(ext as Ext, bytes);
  const content = generateJSON(html, editorExtensions) as DocContent;

  if (!hasText(content)) {
    throw new AppError("UNPARSEABLE_FILE", "No text content was found in this file");
  }
  if (JSON.stringify(content).length > MAX_CONTENT_CHARS) {
    throw new AppError("FILE_TOO_LARGE", "This file has too much content for one document (max ~1 MB of text)");
  }

  const title = base.trim().slice(0, 200).trim() || "Untitled document";
  return { title, content };
}
