import type { DocSummary } from "./services/documents";

export type DocTab = "all" | "owned" | "shared";

/** The dashboard's visible list for a filter tab + search query, newest edit first. */
export function visibleDocs(owned: DocSummary[], shared: DocSummary[], tab: DocTab, query: string): DocSummary[] {
  const base = tab === "owned" ? owned : tab === "shared" ? shared : [...owned, ...shared];
  const q = query.trim().toLowerCase();
  const matches = (d: DocSummary) =>
    !q || d.title.toLowerCase().includes(q) || (d.role !== "owner" && d.ownerName.toLowerCase().includes(q));
  return base
    .filter(matches)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
