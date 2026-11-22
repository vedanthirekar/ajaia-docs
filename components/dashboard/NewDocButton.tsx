"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateDocument } from "./useCreateDocument";

export function NewDocButton() {
  const { create, pending } = useCreateDocument();
  return (
    <Button variant="primary" size="cta" onClick={create} disabled={pending}>
      <Plus strokeWidth={2} />
      {pending ? "Creating…" : "New document"}
    </Button>
  );
}

/** Dashed "Blank document" tile at the start of the grid (same action as "New document"). */
export function BlankDocTile() {
  const { create, pending } = useCreateDocument();
  return (
    <button
      type="button"
      onClick={create}
      disabled={pending}
      className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-card border-[1.5px] border-dashed border-dashline text-[13px] font-medium text-ink-2 outline-none transition-colors hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
    >
      <span className="flex size-11 items-center justify-center rounded-full border-[1.5px] border-ink bg-surface text-ink shadow-offset-sm">
        <Plus className="size-[18px]" strokeWidth={2} />
      </span>
      {pending ? "Creating…" : "Blank document"}
    </button>
  );
}
