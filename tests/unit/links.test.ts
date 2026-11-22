import { describe, expect, it } from "vitest";
import { normalizeLinkUrl } from "@/lib/editor/links";

describe("normalizeLinkUrl", () => {
  it("adds https:// to bare domains", () => {
    expect(normalizeLinkUrl("example.com/page")).toEqual({ ok: true, href: "https://example.com/page" });
    expect(normalizeLinkUrl("  www.ajaia.ai ")).toEqual({ ok: true, href: "https://www.ajaia.ai" });
  });
  it("keeps http, https and mailto links", () => {
    expect(normalizeLinkUrl("http://x.dev")).toEqual({ ok: true, href: "http://x.dev" });
    expect(normalizeLinkUrl("HTTPS://X.dev/a?b=1")).toEqual({ ok: true, href: "HTTPS://X.dev/a?b=1" });
    expect(normalizeLinkUrl("mailto:a@b.co")).toEqual({ ok: true, href: "mailto:a@b.co" });
  });
  it("rejects dangerous or unsupported schemes", () => {
    expect(normalizeLinkUrl("javascript:alert(1)").ok).toBe(false);
    expect(normalizeLinkUrl("JavaScript:alert(1)").ok).toBe(false);
    expect(normalizeLinkUrl("data:text/html,hi").ok).toBe(false);
    expect(normalizeLinkUrl("ftp://files.example.com").ok).toBe(false);
  });
  it("rejects empty input and things that aren't URLs", () => {
    expect(normalizeLinkUrl("   ").ok).toBe(false);
    expect(normalizeLinkUrl("not a url").ok).toBe(false);
  });
});
