import { describe, expect, it } from "vitest";
import {
  DEFAULT_FONT_SIZE,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  normalizeHexColor,
  parseFontSize,
  stepFontSize,
} from "@/lib/editor/formatting";

describe("parseFontSize", () => {
  it("accepts whole and decimal numbers, with or without px", () => {
    expect(parseFontSize("18")).toBe(18);
    expect(parseFontSize(" 13.5 ")).toBe(13.5);
    expect(parseFontSize("20px")).toBe(20);
  });
  it("clamps to the allowed range", () => {
    expect(parseFontSize("2")).toBe(MIN_FONT_SIZE);
    expect(parseFontSize("500")).toBe(MAX_FONT_SIZE);
  });
  it("rejects non-numbers", () => {
    expect(parseFontSize("")).toBeNull();
    expect(parseFontSize("big")).toBeNull();
    expect(parseFontSize("-4")).toBeNull();
  });
});

describe("stepFontSize", () => {
  it("moves to the next/previous preset like Google Docs", () => {
    expect(stepFontSize(DEFAULT_FONT_SIZE, 1)).toBe(18);
    expect(stepFontSize(DEFAULT_FONT_SIZE, -1)).toBe(14);
    expect(stepFontSize(13, 1)).toBe(14); // off-preset values snap to the next preset
    expect(stepFontSize(13, -1)).toBe(12);
  });
  it("stays within bounds", () => {
    expect(stepFontSize(MIN_FONT_SIZE, -1)).toBe(MIN_FONT_SIZE);
    expect(stepFontSize(MAX_FONT_SIZE, 1)).toBe(MAX_FONT_SIZE);
  });
});

describe("normalizeHexColor", () => {
  it("accepts #rgb and #rrggbb (case-insensitive), returning lowercase #rrggbb", () => {
    expect(normalizeHexColor("#ABC")).toBe("#aabbcc");
    expect(normalizeHexColor("#1A2b3C")).toBe("#1a2b3c");
    expect(normalizeHexColor("1a2b3c")).toBe("#1a2b3c");
  });
  it("rejects anything else (no CSS injection through the colour value)", () => {
    expect(normalizeHexColor("red; background: url(x)")).toBeNull();
    expect(normalizeHexColor("#12345")).toBeNull();
    expect(normalizeHexColor("")).toBeNull();
  });
});
