"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, Globe, MoreVertical, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareDialog } from "@/components/share/ShareDialog";
import { apiFetch, ApiError } from "@/lib/client/api";
import { timeAgo } from "@/lib/format";
import type { DocSummary } from "@/lib/services/documents";

const ROLE_LABEL = { owner: "Owner", editor: "Editor", viewer: "Viewer" } as const;

export function DocList({ docs, emptyText }: { docs: DocSummary[]; emptyText: string }) {
  const router = useRouter();
  const [toDelete, setToDelete] = useState<DocSummary | null>(null);
  const [toShare, setToShare] = useState<DocSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  if (docs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="doc-list">
        {docs.map((d) => (
          <li
            key={d.id}
            className="group relative flex items-start gap-3 rounded-xl border bg-background p-4 shadow-xs transition hover:border-foreground/20 hover:shadow-sm"
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={`/documents/${d.id}`}
                className="block truncate font-medium outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
              >
                {d.title}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Edited{" "}
                  {/* Relative time differs between server render and hydration by design. */}
                  <time dateTime={new Date(d.updatedAt).toISOString()} suppressHydrationWarning>
                    {timeAgo(d.updatedAt)}
                  </time>
                </span>
                {d.isPublic && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1" title="Anyone with the link can view">
                      <Globe className="size-3" />
                      Public
                    </span>
                  </>
                )}
                {d.role !== "owner" && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="truncate">Owner: {d.ownerName}</span>
                  </>
                )}
              </div>
            </div>
            {d.role !== "owner" ? (
              <Badge variant={d.role === "editor" ? "secondary" : "outline"} className="relative z-10 shrink-0">
                {ROLE_LABEL[d.role]}
              </Badge>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="relative z-10 shrink-0"
                      aria-label={`Actions for ${d.title}`}
                    />
                  }
                >
                  <MoreVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setToShare(d)}>
                    <Share2 />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setToDelete(d)}>
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>

      {toShare && (
        <ShareDialog
          key={toShare.id}
          docId={toShare.id}
          docTitle={toShare.title}
          initialOpen
          hideTrigger
          onClosed={() => setToShare(null)}
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
