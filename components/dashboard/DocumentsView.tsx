"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { ShareDialog } from "@/components/share/ShareDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch, ApiError } from "@/lib/client/api";
import { visibleDocs, type DocTab } from "@/lib/dashboard";
import { SUPPORTED_LABEL } from "@/lib/import/constants";
import type { DocSummary } from "@/lib/services/documents";
import { cn } from "@/lib/utils";
import { DocCard } from "./DocCard";
import { ImportButton } from "./ImportButton";
import { BlankDocTile, NewDocButton } from "./NewDocButton";

const TABS: { id: DocTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "owned", label: "Owned by me" },
  { id: "shared", label: "Shared with me" },
];

const EMPTY_TEXT: Record<DocTab, string> = {
  all: "No documents yet. Create one or import a file.",
  owned: "You haven't created any documents yet.",
  shared: "Nothing shared with you yet.",
};

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export function DocumentsView({
  user,
  owned,
  shared,
}: {
  user: { name: string; email: string };
  owned: DocSummary[];
  shared: DocSummary[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<DocTab>("all");
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<DocSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toShare, setToShare] = useState<DocSummary | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const docs = useMemo(() => visibleDocs(owned, shared, tab, query), [owned, shared, tab, query]);
  const total = owned.length + shared.length;

  // ⌘K / Ctrl+K focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/documents/${toDelete.id}`, { method: "DELETE" });
      toast.success(`Deleted “${toDelete.title}”`);
      setToDelete(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't delete the document");
    } finally {
      setDeleting(false);
    }
  }

  const showBlankTile = tab !== "shared" && !query.trim();

  return (
    <>
      <AppHeader user={user}>
        <label className="mx-auto flex h-[38px] w-full max-w-[420px] items-center gap-2 rounded-lg border border-field bg-cream px-3.5 text-[13px] text-meta focus-within:border-ink-2 focus-within:ring-3 focus-within:ring-ring/20">
          <Search className="size-[15px] shrink-0" strokeWidth={1.8} aria-hidden />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search documents"
            aria-label="Search documents"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-meta [&::-webkit-search-cancel-button]:hidden"
          />
          <kbd
            className="hidden shrink-0 rounded-[4px] border border-field bg-surface px-[5px] py-px font-sans text-[11px] sm:inline"
            suppressHydrationWarning
          >
            {isMac() ? "⌘K" : "Ctrl K"}
          </kbd>
        </label>
      </AppHeader>

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pt-10 pb-14 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[38px] leading-tight font-medium tracking-[-0.01em]">Documents</h1>
            <p className="mt-1.5 text-sm text-meta">
              {total} {total === 1 ? "document" : "documents"} · {shared.length} shared with you
            </p>
          </div>
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <div className="flex flex-wrap items-center gap-3">
              <ImportButton />
              <NewDocButton />
            </div>
            <span className="text-xs text-meta">{SUPPORTED_LABEL}</span>
          </div>
        </div>

        <nav aria-label="Filter documents" className="mt-7 flex flex-wrap items-center gap-2 text-[13px]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-full px-3.5 py-[7px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                tab === t.id
                  ? "bg-ink font-medium text-white"
                  : "border border-field text-ink-2 hover:border-ink-2 hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
          <span className="ml-auto py-[7px] text-meta">Last edited ↓</span>
        </nav>

        <section aria-label={TABS.find((t) => t.id === tab)!.label} className="mt-[22px]">
          {docs.length === 0 && !showBlankTile ? (
            <div className="rounded-card border border-dashed border-dashline px-6 py-12 text-center text-sm text-meta">
              {query.trim() ? `No documents match “${query.trim()}”.` : EMPTY_TEXT[tab]}
            </div>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[22px]" data-testid="doc-list">
              {showBlankTile && (
                <li>
                  <BlankDocTile />
                </li>
              )}
              {docs.map((d, i) => (
                <DocCard key={d.id} doc={d} index={i} onShare={setToShare} onDelete={setToDelete} />
              ))}
            </ul>
          )}
        </section>
      </main>

      {toShare && (
        <ShareDialog
          key={toShare.id}
          docId={toShare.id}
          docTitle={toShare.title}
          initialOpen
          hideTrigger
          onClosed={() => {
            setToShare(null);
            router.refresh(); // reflect a visibility change (Public tag)
          }}
        />
      )}

      <Dialog open={toDelete !== null} onOpenChange={(open) => !open && !deleting && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this document?</DialogTitle>
            <DialogDescription>
              “{toDelete?.title}” will be permanently deleted for you and everyone it’s shared with.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={deleting} />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
