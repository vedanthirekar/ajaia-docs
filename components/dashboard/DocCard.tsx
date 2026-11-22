"use client";

import Link from "next/link";
import { Globe, MoreHorizontal, Share2, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { timeAgo } from "@/lib/format";
import type { DocSummary } from "@/lib/services/documents";
import { cn } from "@/lib/utils";

const ROLE_LABEL = { owner: "Owner", editor: "Editor", viewer: "Viewer" } as const;

/** Soft pastels cycled across cards (spec: "Cycle the soft pastels across cards"). */
const THUMB_FILLS = ["bg-sky-soft", "bg-blush-soft", "bg-butter-soft", "bg-mint-soft"] as const;

/** Decorative widths for the grey "text lines" on the mini page. */
const LINE_WIDTHS = ["100%", "88%", "94%", "60%", "100%", "76%"];

export function DocCard({
  doc,
  index,
  onShare,
  onDelete,
}: {
  doc: DocSummary;
  index: number;
  onShare: (d: DocSummary) => void;
  onDelete: (d: DocSummary) => void;
}) {
  const shared = doc.role !== "owner";
  return (
    <li className="group relative">
      <Link
        href={`/documents/${doc.id}`}
        className="block overflow-hidden rounded-card border border-card-border bg-surface outline-none transition-colors hover:border-dashline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {/* Thumbnail: pastel field with a mini outlined "page" */}
        <div
          aria-hidden
          className={cn("flex h-40 justify-center overflow-hidden pt-5", THUMB_FILLS[index % THUMB_FILLS.length])}
        >
          <div className="w-[62%] rounded-t-[4px] border-[1.5px] border-b-0 border-ink bg-page px-3.5 pt-3.5">
            <div className="mb-2 truncate font-display text-[10px] font-medium">{doc.title}</div>
            {LINE_WIDTHS.map((w, i) => (
              <div
                key={i}
                className={cn("h-[3px] rounded-[2px] bg-[#e8e3d9]", i === 3 ? "mb-[11px]" : "mb-[5px]")}
                style={{ width: w }}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-line px-3.5 pt-3 pb-3.5">
          <div className="truncate text-sm font-medium">{doc.title}</div>
          <div className="mt-[5px] flex items-center gap-1.5 text-xs text-meta">
            <span className="shrink-0">
              {shared ? "" : "Edited "}
              {/* Relative time differs between server render and hydration by design. */}
              <time dateTime={new Date(doc.updatedAt).toISOString()} suppressHydrationWarning>
                {timeAgo(doc.updatedAt)}
              </time>
            </span>
            {shared && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate" title={`Owner: ${doc.ownerName}`}>
                  <span className="sr-only">Owner: </span>
                  {doc.ownerName}
                </span>
              </>
            )}
            {doc.isPublic && (
              <span className="inline-flex shrink-0 items-center gap-1" title="Anyone with the link can view">
                <span aria-hidden>·</span>
                <Globe className="size-3" />
                Public
              </span>
            )}
            {shared && (
              <span className="ml-auto shrink-0 rounded-full border border-ink px-[7px] py-px text-[11px] font-medium text-ink">
                {ROLE_LABEL[doc.role]}
              </span>
            )}
          </div>
        </div>
      </Link>

      {!shared && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label={`Actions for ${doc.title}`}
                className="absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-lg border border-card-border bg-surface/90 text-ink-2 opacity-100 outline-none transition-opacity hover:bg-surface hover:text-ink focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onShare(doc)}>
              <Share2 />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(doc)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
