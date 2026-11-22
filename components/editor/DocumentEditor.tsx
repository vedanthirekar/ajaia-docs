"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { AlertTriangle, Copy, Ellipsis, Eye, Link2, Printer, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserMenu } from "@/components/UserMenu";
import { ShareDialog } from "@/components/share/ShareDialog";
import type { DocContent } from "@/lib/db/schema";
import { buildEditorExtensions } from "@/lib/editor/extensions";
import {
  canKeepalive,
  createSaveQueue,
  type SavePayload,
  type SaveQueue,
  type SaveResult,
  type SaveState,
} from "@/lib/editor/saveQueue";
import { timeAgo } from "@/lib/format";
import type { Role } from "@/lib/permissions";
import { SaveStatus } from "./SaveStatus";
import { TitleInput } from "./TitleInput";
import { Toolbar } from "./Toolbar";

export type EditorDoc = {
  id: string;
  title: string;
  content: DocContent;
  version: number;
  role: Role;
  ownerName: string;
  isPublic: boolean;
  updatedAt: Date | string;
};

async function patchDocument(id: string, payload: SavePayload): Promise<SaveResult> {
  const body = JSON.stringify(payload);
  const res = await fetch(`/api/documents/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body,
    // keepalive lets a save outlive the page (tab close / reload). Browsers reject
    // keepalive bodies over 64 KiB, so larger docs fall back to a normal request.
    keepalive: canKeepalive(body),
  });
  if (!res.ok) return { ok: false, status: res.status };
  const saved = (await res.json()) as { version: number };
  return { ok: true, version: saved.version };
}

export function DocumentEditor({
  doc,
  user,
}: {
  doc: EditorDoc;
  /** null for a signed-out visitor of a public document */
  user: { name: string; email: string } | null;
}) {
  const canEdit = doc.role !== "viewer";
  const [state, setState] = useState<SaveState>("saved");
  const [title, setTitle] = useState(doc.title);
  const [lastEdited, setLastEdited] = useState(() => new Date(doc.updatedAt));
  // The queue's lifetime is owned by the effect below (NOT useMemo): React Strict
  // Mode mounts → unmounts → remounts effects in dev, and a memoized queue would be
  // disposed by the first cleanup and then silently reused, dropping every edit.
  const queueRef = useRef<SaveQueue | null>(null);

  const editor = useEditor({
    extensions: [
      ...buildEditorExtensions({ editable: canEdit }),
      Placeholder.configure({ placeholder: canEdit ? "Start writing…" : "This document is empty." }),
    ],
    content: doc.content as JSONContent,
    editable: canEdit,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "doc-content",
        "aria-label": "Document content",
        "data-testid": "editor",
      },
    },
    onUpdate: ({ editor: e }) => queueRef.current?.setContent(e.getJSON() as DocContent),
  });

  // Stop editing once saving is impossible (conflict / access lost / signed out / rejected).
  const locked = state === "conflict" || state === "forbidden" || state === "unauthenticated" || state === "rejected";
  useEffect(() => {
    if (editor && locked) editor.setEditable(false);
  }, [editor, locked]);

  // Create the save queue; flush on tab hide / page hide; warn before unload with unsaved edits.
  useEffect(() => {
    const queue = createSaveQueue({
      initialVersion: doc.version,
      save: (payload) => patchDocument(doc.id, payload),
      onState: (next) => {
        setState(next);
        if (next === "saved") setLastEdited(new Date());
      },
    });
    queueRef.current = queue;

    const onHide = () => {
      if (document.visibilityState === "hidden") void queue.flush({ keepalive: true });
    };
    // Only pagehide means the page is really going away (beforeunload can be cancelled),
    // so only here may edits typed during an in-flight save be sent speculatively.
    const onPageHide = () => void queue.flush({ keepalive: true, unloading: true });
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (queue.hasUnsavedChanges()) {
        void queue.flush({ keepalive: true });
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (queueRef.current === queue) queueRef.current = null;
      void queue.flush({ keepalive: true }).finally(() => queue.dispose());
    };
  }, [doc.id, doc.version]);

  useEffect(() => {
    document.title = `${title} · Ajaia Docs`;
  }, [title]);

  const commitTitle = (t: string) => {
    setTitle(t);
    queueRef.current?.setTitle(t);
    void queueRef.current?.flush();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/documents/${doc.id}`);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  };

  const copyText = async () => {
    if (!editor) return;
    try {
      await navigator.clipboard.writeText(editor.getText({ blockSeparator: "\n\n" }));
      toast.success("Copied your text to the clipboard");
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  };

  return (
    <>
      {/* Editor header (spec: 60px, full width, logo as back link, title + status under it) */}
      <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3.5 border-b border-line bg-surface px-4 sm:px-5 print:hidden">
        <Link
          href="/"
          aria-label={user ? "Back to documents" : "Ajaia Docs home"}
          className="flex shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Image src="/logo.png" alt="" width={30} height={30} priority />
        </Link>
        <div className="min-w-0 flex-1">
          <TitleInput value={title} editable={canEdit && !locked} onCommit={commitTitle} />
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-meta">
            {canEdit ? (
              <SaveStatus state={state} />
            ) : (
              <span className="inline-flex items-center gap-1.5" data-testid="view-only">
                <Eye className="size-3" aria-hidden />
                View only
              </span>
            )}
            {user && (
              <>
                <span aria-hidden>·</span>
                <Link href="/" className="hover:text-ink hover:underline">
                  Documents
                </Link>
              </>
            )}
          </div>
        </div>
        {doc.role === "owner" && <ShareDialog docId={doc.id} docTitle={title} />}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="More"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-field bg-surface text-ink-2 outline-none hover:bg-cream hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            }
          >
            <Ellipsis className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={copyLink}>
              <Link2 />
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.print()}>
              <Printer />
              Print (A4)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {user ? (
          <UserMenu name={user.name} email={user.email} />
        ) : (
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(`/documents/${doc.id}`)}`}
            className={buttonVariants({ variant: "ink-outline", size: "sm" })}
          >
            Sign in
          </Link>
        )}
      </header>

      <div className="mx-auto w-full max-w-[1000px] flex-1 px-2 pb-24 sm:px-4 print:max-w-none print:p-0">
        {(locked || !canEdit) && (
          <div className="mx-auto mt-4 max-w-[210mm] space-y-3 print:hidden">
            {state === "conflict" && (
              <Alert variant="destructive" data-testid="conflict-banner">
                <AlertTriangle />
                <AlertTitle>This document was changed elsewhere.</AlertTitle>
                <AlertDescription>
                  Your latest edits weren’t saved to avoid overwriting newer changes. Reload to see the latest
                  version{editor ? " — copy your text first if you need it." : "."}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => window.location.reload()}>
                      <RotateCw />
                      Reload
                    </Button>
                    <Button size="sm" variant="outline" onClick={copyText}>
                      <Copy />
                      Copy my text
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {state === "forbidden" && (
              <Alert variant="destructive" data-testid="forbidden-banner">
                <AlertTriangle />
                <AlertTitle>You no longer have edit access to this document.</AlertTitle>
                <AlertDescription>
                  Your recent edits weren’t saved. Ask {doc.ownerName} for access, or copy your text.
                  <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={copyText}>
                      <Copy />
                      Copy my text
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {state === "unauthenticated" && (
              <Alert variant="destructive" data-testid="signed-out-banner">
                <AlertTriangle />
                <AlertTitle>You’ve been signed out.</AlertTitle>
                <AlertDescription>
                  Your recent edits weren’t saved. Copy your text, then sign in again.
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={copyText}>
                      <Copy />
                      Copy my text
                    </Button>
                    <Button
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/login?callbackUrl=${encodeURIComponent(`/documents/${doc.id}`)}`} />}
                    >
                      Sign in again
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {state === "rejected" && (
              <Alert variant="destructive" data-testid="rejected-banner">
                <AlertTriangle />
                <AlertTitle>This change couldn’t be saved.</AlertTitle>
                <AlertDescription>
                  The document may have grown past the 1 MB limit. Copy your text and split it into another document.
                  <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={copyText}>
                      <Copy />
                      Copy my text
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {!canEdit && (
              <p className="text-center text-sm text-muted-foreground" data-testid="viewer-note">
                {user
                  ? `You have view-only access. Owner: ${doc.ownerName}.`
                  : `You're viewing a public document by ${doc.ownerName}. Sign in if you've been given edit access.`}
              </p>
            )}
          </div>
        )}

        {canEdit && editor && !locked && (
          <div className="sticky top-[60px] z-20 -mx-2 bg-cream/90 px-2 pt-3.5 pb-2 backdrop-blur-sm print:hidden">
            <Toolbar editor={editor} />
          </div>
        )}

        {/* A4 sheet: 210 × 297 mm with Word's default 2.54 cm margins. Printing uses @page A4 (globals.css). */}
        <article
          data-testid="page"
          className="doc-page mx-auto mt-3 w-full max-w-[210mm] min-h-[297mm] rounded-[6px] border border-card-border bg-page px-6 py-10 sm:px-[25.4mm] sm:py-[25.4mm] print:m-0 print:min-h-0 print:max-w-none print:border-0 print:p-0"
        >
          <p className="mb-7 text-[13px] text-meta print:hidden">
            {doc.ownerName} · Last edited{" "}
            <time dateTime={lastEdited.toISOString()} suppressHydrationWarning>
              {timeAgo(lastEdited)}
            </time>
          </p>
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div className="space-y-3" aria-hidden>
              <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            </div>
          )}
        </article>
      </div>
    </>
  );
}
