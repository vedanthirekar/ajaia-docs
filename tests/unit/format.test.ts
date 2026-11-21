import { describe, expect, it } from "vitest";
import { safeCallbackUrl, timeAgo } from "@/lib/format";

describe("timeAgo", () => {
  const now = new Date("2026-11-21T12:00:00Z");
  it("formats recent times relatively", () => {
    expect(timeAgo(new Date("2026-11-21T11:59:40Z"), now)).toBe("just now");
    expect(timeAgo(new Date("2026-11-21T11:55:00Z"), now)).toBe("5m ago");
    expect(timeAgo(new Date("2026-11-21T09:00:00Z"), now)).toBe("3h ago");
    expect(timeAgo("2026-11-19T12:00:00Z", now)).toBe("2d ago");
  });
  it("formats older times as a date", () => {
    expect(timeAgo(new Date("2026-10-01T12:00:00Z"), now)).toBe("Oct 1, 2026");
  });
  it("treats future timestamps (clock skew) as just now", () => {
    expect(timeAgo(new Date("2026-11-21T12:00:30Z"), now)).toBe("just now");
  });
});

describe("safeCallbackUrl", () => {
  it("allows same-origin relative paths", () => {
    expect(safeCallbackUrl("/documents/abc?x=1")).toBe("/documents/abc?x=1");
  });
  it("rejects absolute, protocol-relative and backslash URLs", () => {
    expect(safeCallbackUrl("https://evil.com")).toBe("/");
    expect(safeCallbackUrl("//evil.com")).toBe("/");
    expect(safeCallbackUrl("/\\evil.com")).toBe("/");
    expect(safeCallbackUrl(undefined)).toBe("/");
    expect(safeCallbackUrl(["/a", "/b"])).toBe("/");
  });
});
