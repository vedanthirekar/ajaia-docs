/** Font-size and colour helpers for the toolbar (pure, unit-tested). */

export const DEFAULT_FONT_SIZE = 16; // matches the editor's base font size (1rem)
export const MIN_FONT_SIZE = 6;
export const MAX_FONT_SIZE = 96;
export const FONT_SIZE_PRESETS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72, 96] as const;

/** Parse a user-typed size ("18", "13.5", "20px"); clamps to range, null if not a positive number. */
export function parseFontSize(input: string): number | null {
  const m = input.trim().match(/^(\d+(?:\.\d+)?)\s*(px)?$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(n * 10) / 10));
}

/** Next (+1) / previous (−1) preset size, snapping off-preset values; stays within bounds. */
export function stepFontSize(current: number, dir: 1 | -1): number {
  if (dir === 1) return FONT_SIZE_PRESETS.find((p) => p > current) ?? MAX_FONT_SIZE;
  return [...FONT_SIZE_PRESETS].reverse().find((p) => p < current) ?? MIN_FONT_SIZE;
}

/** Validate a hex colour; returns lowercase #rrggbb or null (prevents CSS injection via style attrs). */
export function normalizeHexColor(input: string): string | null {
  const m = input.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let hex = m[1].toLowerCase();
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  return `#${hex}`;
}

/** Google-Docs-style palette: a greyscale row, then hue columns in light → dark shades. */
export const COLOR_PALETTE: string[][] = [
  ["#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#d9d9d9", "#efefef", "#ffffff"],
  ["#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#2563eb", "#7c3aed", "#db2777"],
  ["#fca5a5", "#fdba74", "#fde047", "#86efac", "#67e8f9", "#93c5fd", "#c4b5fd", "#f9a8d4"],
  ["#f87171", "#fb923c", "#facc15", "#4ade80", "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6"],
  ["#b91c1c", "#c2410c", "#a16207", "#15803d", "#0e7490", "#1d4ed8", "#6d28d9", "#be185d"],
  ["#7f1d1d", "#7c2d12", "#713f12", "#14532d", "#164e63", "#1e3a8a", "#4c1d95", "#831843"],
];
