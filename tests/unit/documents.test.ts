import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import type { Db } from "@/lib/db/types";
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  updateDocument,
} from "@/lib/services/documents";
import type { DocContent } from "@/lib/db/schema";
import { makeShare, makeUser } from "./helpers";

const rich: DocContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "bold", marks: [{ type: "bold" }] },
        { type: "text", text: " under", marks: [{ type: "underline" }, { type: "italic" }] },
      ],
    },
    {
      type: "bulletList",
      content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }] }],
    },
  ],
};

describe("documents service", () => {
  let db: Db;
  let a: Awaited<ReturnType<typeof makeUser>>;
  let b: Awaited<ReturnType<typeof makeUser>>;
  beforeEach(async () => {
    db = await createTestDb();
    a = await makeUser(db, "a@x.com", "Alice");
    b = await makeUser(db, "b@x.com", "Bob");
  });

  it("creates with default title, version 1 and owner role", async () => {
    const d = await createDocument(db, a);
    expect(d.title).toBe("Untitled document");
    expect(d.version).toBe(1);
    expect(d.role).toBe("owner");
    expect(d.ownerName).toBe("Alice");
  });

  it("updates content with the current version, bumps version and round-trips formatting", async () => {
    const d = await createDocument(db, a);
    const u = await updateDocument(db, a, d.id, { content: rich, version: 1 });
    expect(u.version).toBe(2);
    const fetched = await getDocument(db, a, d.id);
    expect(fetched.content).toEqual(rich);
    expect(fetched.updatedAt.getTime()).toBeGreaterThanOrEqual(d.updatedAt.getTime());
  });

  it("rejects a stale version with VERSION_CONFLICT and keeps newer content", async () => {
    const d = await createDocument(db, a);
    await updateDocument(db, a, d.id, { content: rich, version: 1 });
    await expect(
      updateDocument(db, a, d.id, { content: { type: "doc", content: [] }, version: 1 }),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    expect((await getDocument(db, a, d.id)).content).toEqual(rich);
  });

  it("viewer cannot update content or rename (FORBIDDEN)", async () => {
    const d = await createDocument(db, a);
    await makeShare(db, d.id, b.email, "viewer", b.id);
    await expect(updateDocument(db, b, d.id, { content: rich, version: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(updateDocument(db, b, d.id, { title: "x", version: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("editor can rename and edit, but cannot delete", async () => {
    const d = await createDocument(db, a);
    await makeShare(db, d.id, b.email, "editor", b.id);
    const r = await updateDocument(db, b, d.id, { title: "Renamed", version: 1 });
    expect(r.title).toBe("Renamed");
    expect(r.role).toBe("editor");
    await expect(deleteDocument(db, b, d.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("stranger gets NOT_FOUND for get, update and delete", async () => {
    const d = await createDocument(db, a);
    await expect(getDocument(db, b, d.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(updateDocument(db, b, d.id, { title: "x", version: 1 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteDocument(db, b, d.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("owner deletes; afterwards the doc is NOT_FOUND", async () => {
    const d = await createDocument(db, a);
    await deleteDocument(db, a, d.id);
    await expect(getDocument(db, a, d.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lists owned and shared separately, newest first, with role and owner name", async () => {
    const d1 = await createDocument(db, a, { title: "First" });
    const d2 = await createDocument(db, a, { title: "Second" });
    await updateDocument(db, a, d1.id, { title: "First edited", version: 1 }); // d1 now newest
    const bDoc = await createDocument(db, b, { title: "Bob's" });
    await makeShare(db, bDoc.id, a.email, "viewer", null); // pending, matched by email

    const list = await listDocuments(db, a);
    expect(list.owned.map((d) => d.id)).toEqual([d1.id, d2.id]);
    expect(list.shared).toHaveLength(1);
    expect(list.shared[0]).toMatchObject({ id: bDoc.id, role: "viewer", ownerName: "Bob", ownerEmail: "b@x.com" });

    const listB = await listDocuments(db, b);
    expect(listB.owned.map((d) => d.id)).toEqual([bDoc.id]);
    expect(listB.shared).toEqual([]);
  });
});
