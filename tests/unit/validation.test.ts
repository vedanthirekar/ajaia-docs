import { describe, expect, it } from "vitest";
import {
  createShareSchema,
  emailSchema,
  signupSchema,
  titleSchema,
  updateDocSchema,
} from "@/lib/validation";

const doc = { type: "doc", content: [{ type: "paragraph" }] };

describe("emailSchema", () => {
  it("trims and lowercases", () => {
    expect(emailSchema.parse("  Bob@Example.COM ")).toBe("bob@example.com");
  });
  it("rejects non-emails", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("titleSchema", () => {
  it("rejects empty and whitespace-only titles", () => {
    expect(titleSchema.safeParse("").success).toBe(false);
    expect(titleSchema.safeParse("   ").success).toBe(false);
  });
  it("rejects titles over 200 chars", () => {
    expect(titleSchema.safeParse("a".repeat(201)).success).toBe(false);
    expect(titleSchema.safeParse("a".repeat(200)).success).toBe(true);
  });
  it("trims", () => {
    expect(titleSchema.parse("  Hi ")).toBe("Hi");
  });
});

describe("signupSchema", () => {
  it("rejects a 7-char password", () => {
    const r = signupSchema.safeParse({ name: "A", email: "a@x.com", password: "1234567" });
    expect(r.success).toBe(false);
  });
  it("accepts a valid signup and normalizes email", () => {
    const r = signupSchema.parse({ name: " Ann ", email: "A@X.com", password: "12345678" });
    expect(r).toEqual({ name: "Ann", email: "a@x.com", password: "12345678" });
  });
});

describe("updateDocSchema", () => {
  it("requires title or content", () => {
    expect(updateDocSchema.safeParse({ version: 1 }).success).toBe(false);
  });
  it("requires a positive integer version", () => {
    expect(updateDocSchema.safeParse({ title: "x" }).success).toBe(false);
    expect(updateDocSchema.safeParse({ title: "x", version: 0 }).success).toBe(false);
  });
  it("rejects content that is not a doc node", () => {
    expect(updateDocSchema.safeParse({ content: { type: "paragraph" }, version: 1 }).success).toBe(false);
  });
  it("rejects content over 1 MB serialized", () => {
    const big = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(1_000_001) }] }] };
    const r = updateDocSchema.safeParse({ content: big, version: 1 });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/large/i);
  });
  it("accepts valid content", () => {
    expect(updateDocSchema.safeParse({ content: doc, version: 3 }).success).toBe(true);
  });
});

describe("createShareSchema", () => {
  it("rejects role owner", () => {
    expect(createShareSchema.safeParse({ email: "a@x.com", role: "owner" }).success).toBe(false);
  });
  it("accepts viewer/editor", () => {
    expect(createShareSchema.parse({ email: " A@x.com", role: "editor" })).toEqual({ email: "a@x.com", role: "editor" });
  });
});
