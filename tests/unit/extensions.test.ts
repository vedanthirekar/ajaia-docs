import { describe, expect, it } from "vitest";
import { generateHTML, generateJSON } from "@tiptap/html/server";
import { buildEditorExtensions, editorExtensions } from "@/lib/editor/extensions";

type Node = { type: string; attrs?: Record<string, unknown>; marks?: { type: string; attrs?: Record<string, unknown> }[]; content?: Node[] };
const walk = (n: Node, out: Node[] = []): Node[] => {
  out.push(n);
  n.content?.forEach((c) => walk(c, out));
  return out;
};
const parse = (html: string) => generateJSON(html, editorExtensions) as Node;

describe("document schema (shared by editor and import)", () => {
  it("keeps paragraph and heading text alignment", () => {
    const doc = parse('<p style="text-align: center">c</p><h2 style="text-align: right">r</h2>');
    const [p, h] = doc.content!;
    expect(p.attrs?.textAlign).toBe("center");
    expect(h.attrs?.textAlign).toBe("right");
  });

  it("keeps highlight marks", () => {
    const doc = parse("<p><mark>hi</mark></p>");
    expect(walk(doc).some((n) => n.marks?.some((m) => m.type === "highlight"))).toBe(true);
  });

  it("keeps text colour and font size as textStyle attributes", () => {
    const doc = parse('<p><span style="color: #dc2626; font-size: 24px">big red</span></p>');
    const mark = walk(doc)
      .flatMap((n) => n.marks ?? [])
      .find((m) => m.type === "textStyle");
    expect(mark?.attrs?.color).toBe("#dc2626");
    expect(mark?.attrs?.fontSize).toBe("24px");
  });

  it("keeps links but strips javascript: URLs", () => {
    const ok = parse('<p><a href="https://example.com">x</a></p>');
    const bad = parse('<p><a href="javascript:alert(1)">x</a></p>');
    const hrefOf = (d: Node) => walk(d).flatMap((n) => n.marks ?? []).find((m) => m.type === "link")?.attrs?.href;
    expect(hrefOf(ok)).toBe("https://example.com");
    expect(hrefOf(bad)).toBeUndefined();
  });

  it("keeps blockquotes and horizontal rules", () => {
    const doc = parse("<blockquote><p>q</p></blockquote><hr>");
    const types = new Set(walk(doc).map((n) => n.type));
    expect(types.has("blockquote")).toBe(true);
    expect(types.has("horizontalRule")).toBe(true);
  });

  it("round-trips the new formats through HTML rendering", () => {
    const doc = parse('<p style="text-align: center"><span style="color: #2563eb">blue</span> <mark>hl</mark></p>');
    const html = generateHTML(doc, editorExtensions);
    expect(html).toContain("text-align: center");
    expect(html).toContain("color: #2563eb");
    expect(html).toContain("<mark>");
  });

  it("read-only editors open links on click; editable ones don't", () => {
    const linkOpt = (exts: ReturnType<typeof buildEditorExtensions>) => {
      const kit = exts.find((e) => e.name === "starterKit") as { options: { link?: { openOnClick?: boolean } } };
      return kit.options.link?.openOnClick;
    };
    expect(linkOpt(buildEditorExtensions({ editable: true }))).toBe(false);
    expect(linkOpt(buildEditorExtensions({ editable: false }))).toBe(true);
  });
});
