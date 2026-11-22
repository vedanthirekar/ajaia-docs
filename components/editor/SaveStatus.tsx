"use client";

import { AlertTriangle, Check, CloudOff, Loader2, PencilLine } from "lucide-react";
import type { SaveState } from "@/lib/editor/saveQueue";
import { cn } from "@/lib/utils";

const COPY: Record<SaveState, { text: string; icon: typeof Check; className?: string }> = {
  saved: { text: "Saved", icon: Check },
  dirty: { text: "Unsaved changes", icon: PencilLine },
  saving: { text: "Saving…", icon: Loader2, className: "[&_svg]:animate-spin" },
  error: { text: "Connection problem — retrying", icon: CloudOff, className: "text-amber-600 dark:text-amber-500" },
  conflict: { text: "Not saved", icon: AlertTriangle, className: "text-destructive" },
  forbidden: { text: "Not saved", icon: AlertTriangle, className: "text-destructive" },
  unauthenticated: { text: "Not saved", icon: AlertTriangle, className: "text-destructive" },
  rejected: { text: "Not saved", icon: AlertTriangle, className: "text-destructive" },
};

export function SaveStatus({ state }: { state: SaveState }) {
  const c = COPY[state];
  const Icon = c.icon;
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="save-status"
      data-state={state}
      className={cn("flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground", c.className)}
    >
      <Icon className="size-3.5" />
      <span className="hidden sm:inline">{c.text}</span>
    </span>
  );
}
