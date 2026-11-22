"use client";

import type { SaveState } from "@/lib/editor/saveQueue";
import { cn } from "@/lib/utils";

/** Spec: 6px dot + label in 12px muted text under the document title. */
const COPY: Record<SaveState, { text: string; dot: string; text_class?: string }> = {
  saved: { text: "Saved", dot: "bg-saved" },
  dirty: { text: "Unsaved changes", dot: "bg-meta" },
  saving: { text: "Saving…", dot: "bg-ink-2 animate-pulse" },
  error: { text: "Connection problem — retrying", dot: "bg-amber-500 animate-pulse", text_class: "text-amber-700" },
  conflict: { text: "Not saved", dot: "bg-destructive", text_class: "text-destructive" },
  forbidden: { text: "Not saved", dot: "bg-destructive", text_class: "text-destructive" },
  unauthenticated: { text: "Not saved", dot: "bg-destructive", text_class: "text-destructive" },
  rejected: { text: "Not saved", dot: "bg-destructive", text_class: "text-destructive" },
};

export function SaveStatus({ state }: { state: SaveState }) {
  const c = COPY[state];
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="save-status"
      data-state={state}
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", c.text_class)}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", c.dot)} />
      {c.text}
    </span>
  );
}
