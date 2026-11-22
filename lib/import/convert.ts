import { generateJSON } from "@tiptap/html/server";
import mammoth from "mammoth";
import { marked } from "marked";
import type { DocContent } from "../db/schema";
import { editorExtensions } from "../editor/extensions";
import { AppError } from "../errors";
import { MAX_CONTENT_CHARS } from "../validation";

import { MAX_IMPORT_BYTES, SUPPORTED_EXTENSIONS } from "./constants";

export { MAX_IMPORT_BYTES, SUPPORTED_EXTENSIONS };
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

/**
 * Decode a text upload: honours UTF-16 LE/BE and UTF-8 BOMs (Windows Notepad's
 * "Unicode" is UTF-16LE), defaults to UTF-8, and rejects binary data — which
 * would otherwise smuggle NUL characters that Postgres jsonb refuses (a 500).
 */
function decodeText(bytes: Buffer): string {
  let encoding = "utf-8";
  let start = 0;
  if (bytes[0] === 0xff && bytes[1] === 0xfe) [encoding, start] = ["utf-16le", 2];
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) [encoding, start] = ["utf-16be", 2];
  else if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) start = 3;

  const text = new TextDecoder(encoding).decode(bytes.subarray(start));
  const replacements = text.match(/�/g)?.length ?? 0;
  if (text.includes("\u0000") || replacements > Math.max(8, text.length * 0.05)) {
    throw new AppError("UNPARSEABLE_FILE", "This file doesn't look like plain text. Is it the right file?");
  }
  return text;
}

async function toHtml(ext: Ext, bytes: Buffer): Promise<string> {
  switch (ext) {
    case ".txt":
      return txtToHtml(decodeText(bytes));
    case ".md":
      return marked.parse(decodeText(bytes), { async: false });
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
