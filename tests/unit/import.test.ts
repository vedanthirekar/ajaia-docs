import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { fileToDoc, MAX_IMPORT_BYTES } from "@/lib/import/convert";

const fixture = (name: string) => readFileSync(path.join(process.cwd(), "tests/fixtures", name));

type Node = { type: string; attrs?: Record<string, unknown>; marks?: { type: string }[]; content?: Node[]; text?: string };
function walk(n: Node, out: Node[] = []): Node[] {
  out.push(n);
  n.content?.forEach((c) => walk(c, out));
  return out;
}
const types = (doc: unknown) => new Set(walk(doc as Node).map((n) => n.type));
const marks = (doc: unknown) => new Set(walk(doc as Node).flatMap((n) => n.marks?.map((m) => m.type) ?? []));
const text = (doc: unknown) => walk(doc as Node).map((n) => n.text ?? "").join("");

describe("fileToDoc", () => {
  it("converts markdown headings, marks and both list types", async () => {
    const { title, content } = await fileToDoc("sample.md", fixture("sample.md"));
    expect(title).toBe("sample");
    expect(content.type).toBe("doc");
    const t = types(content);
    expect(t.has("heading")).toBe(true);
    expect(t.has("bulletList")).toBe(true);
    expect(t.has("orderedList")).toBe(true);
    expect(marks(content).has("bold")).toBe(true);
    expect(marks(content).has("italic")).toBe(true);
    const h = walk(content as Node).find((n) => n.type === "heading");
    expect(h?.attrs?.level).toBe(1);
  });

  it("converts txt: blank lines split paragraphs, HTML stays literal text", async () => {
    const { content } = await fileToDoc("notes.txt", fixture("sample.txt"));
    const paras = (content.content as Node[]).filter((n) => n.type === "paragraph");
    expect(paras).toHaveLength(2);
    expect(text(content)).toContain("<script>alert(1)</script>");
  });

  it("converts docx headings and bold runs", async () => {
    const d = new Document({
      sections: [
        {
          children: [
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Quarterly Plan")] }),
            new Paragraph({ children: [new TextRun({ text: "Important", bold: true }), new TextRun(" detail")] }),
          ],
        },
      ],
    });
    const buf = await Packer.toBuffer(d);
    const { title, content } = await fileToDoc("Q3 Plan.docx", Buffer.from(buf));
    expect(title).toBe("Q3 Plan");
    expect(types(content).has("heading")).toBe(true);
    expect(marks(content).has("bold")).toBe(true);
    expect(text(content)).toContain("Quarterly Plan");
  });

  it("rejects a fake .docx with UNPARSEABLE_FILE", async () => {
    await expect(fileToDoc("evil.docx", Buffer.from("not a zip"))).rejects.toMatchObject({ code: "UNPARSEABLE_FILE" });
  });

  it("rejects empty / whitespace-only files with UNPARSEABLE_FILE", async () => {
    await expect(fileToDoc("empty.md", Buffer.from(""))).rejects.toMatchObject({ code: "UNPARSEABLE_FILE" });
    await expect(fileToDoc("blank.txt", Buffer.from("  \n\n  "))).rejects.toMatchObject({ code: "UNPARSEABLE_FILE" });
  });

  it("rejects unsupported extensions with UNSUPPORTED_FILE (case-insensitive check)", async () => {
    await expect(fileToDoc("x.pdf", Buffer.from("%PDF"))).rejects.toMatchObject({ code: "UNSUPPORTED_FILE" });
    await expect(fileToDoc("noext", Buffer.from("hi"))).rejects.toMatchObject({ code: "UNSUPPORTED_FILE" });
    const ok = await fileToDoc("UPPER.MD", Buffer.from("# Hi"));
    expect(ok.title).toBe("UPPER");
  });

  it("rejects files over 4 MB with FILE_TOO_LARGE", async () => {
    expect(MAX_IMPORT_BYTES).toBe(4 * 1024 * 1024);
    await expect(fileToDoc("big.txt", Buffer.alloc(MAX_IMPORT_BYTES + 1, 97))).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
  });

  it("rejects files whose converted content exceeds the 1 MB document limit", async () => {
    const words = "lorem ipsum ".repeat(150_000); // ~1.8 MB of text, under the 4 MB upload cap
    await expect(fileToDoc("long.txt", Buffer.from(words))).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
  });

  it("falls back to 'Untitled document' and caps title length at 200", async () => {
    expect((await fileToDoc(".md", Buffer.from("hi"))).title).toBe("Untitled document");
    expect((await fileToDoc(`${"a".repeat(250)}.txt`, Buffer.from("hi"))).title).toHaveLength(200);
  });
});
