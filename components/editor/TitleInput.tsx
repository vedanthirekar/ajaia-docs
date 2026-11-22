"use client";

import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

/** Inline-editable document title. Commits on blur or Enter; Escape reverts. */
export function TitleInput({
  value,
  editable,
  onCommit,
}: {
  value: string;
  editable: boolean;
  onCommit: (title: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  // Adopt external changes (e.g. after a save) when not mid-edit.
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  if (!editable) {
    return (
      <h1 className="truncate font-display text-lg leading-[1.1] font-medium" title={value}>
        {value}
      </h1>
    );
  }

  const commit = () => {
    const t = draft.trim();
    if (!t) {
      toast.error("Title can't be empty");
      setDraft(value);
      return;
    }
    if (t.length > 200) {
      toast.error("Title must be 200 characters or fewer");
      setDraft(value);
      return;
    }
    if (t !== value) onCommit(t);
    setDraft(t);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") {
      setDraft(value);
      requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
    }
  };

  return (
    <input
      aria-label="Document title"
      data-testid="doc-title"
      value={draft}
      maxLength={200}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      className="-ml-1.5 h-7 w-full min-w-0 max-w-md truncate rounded-md border border-transparent bg-transparent px-1.5 font-display text-lg leading-[1.1] font-medium outline-none hover:border-field focus:border-ink-2 focus:ring-3 focus:ring-ring/20"
    />
  );
}
