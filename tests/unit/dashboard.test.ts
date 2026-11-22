import { describe, expect, it } from "vitest";
import { visibleDocs } from "@/lib/dashboard";
import type { DocSummary } from "@/lib/services/documents";

const doc = (id: string, title: string, role: DocSummary["role"], updated: string): DocSummary => ({
  id,
  title,
  role,
  updatedAt: new Date(updated),
  ownerName: role === "owner" ? "Me" : "Alice",
  ownerEmail: role === "owner" ? "me@x.com" : "alice@x.com",
  isPublic: false,
});

const owned = [doc("o1", "Q4 planning notes", "owner", "2026-11-20"), doc("o2", "Onboarding guide", "owner", "2026-11-18")];
const shared = [doc("s1", "Product spec v2", "viewer", "2026-11-19"), doc("s2", "Roadmap", "editor", "2026-11-21")];

describe("visibleDocs", () => {
  it("'all' merges owned and shared, newest edit first", () => {
    expect(visibleDocs(owned, shared, "all", "").map((d) => d.id)).toEqual(["s2", "o1", "s1", "o2"]);
  });
  it("'owned' and 'shared' tabs filter by ownership", () => {
    expect(visibleDocs(owned, shared, "owned", "").map((d) => d.id)).toEqual(["o1", "o2"]);
    expect(visibleDocs(owned, shared, "shared", "").map((d) => d.id)).toEqual(["s2", "s1"]);
  });
  it("search matches title words case-insensitively and ignores surrounding spaces", () => {
    expect(visibleDocs(owned, shared, "all", "  PLAN ").map((d) => d.id)).toEqual(["o1"]);
    expect(visibleDocs(owned, shared, "all", "spec").map((d) => d.id)).toEqual(["s1"]);
  });
  it("search also matches the owner's name on shared docs", () => {
    expect(visibleDocs(owned, shared, "all", "alice").map((d) => d.id)).toEqual(["s2", "s1"]);
  });
  it("search combines with the tab", () => {
    expect(visibleDocs(owned, shared, "owned", "roadmap")).toEqual([]);
  });
});
