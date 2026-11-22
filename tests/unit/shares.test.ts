import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import type { Db } from "@/lib/db/types";
import { documentShares } from "@/lib/db/schema";
import { createDocument, deleteDocument, getDocument, listDocuments, updateDocument } from "@/lib/services/documents";
import { createShare, deleteShare, listShares, updateShare } from "@/lib/services/shares";
import { createUserWithPassword } from "@/lib/services/users";
import { makeUser } from "./helpers";

const content = { type: "doc" as const, content: [{ type: "paragraph" }] };

describe("shares service", () => {
  let db: Db;
  let a: Awaited<ReturnType<typeof makeUser>>;
  beforeEach(async () => {
    db = await createTestDb();
    a = await makeUser(db, "a@x.com", "Alice");
  });

  it("sharing with an existing user is active and grants access", async () => {
    const b = await makeUser(db, "b@x.com", "Bob");
    const d = await createDocument(db, a);
    const s = await createShare(db, a, d.id, { email: "b@x.com", role: "editor" });
    expect(s).toMatchObject({ email: "b@x.com", role: "editor", status: "active", name: "Bob" });
    expect((await getDocument(db, b, d.id)).role).toBe("editor");
  });

  it("sharing to a not-yet-registered, messy-cased email is pending, then appears after signup", async () => {
    const d = await createDocument(db, a);
    const s = await createShare(db, a, d.id, { email: " Bob@Example.com ", role: "viewer" });
    expect(s).toMatchObject({ email: "bob@example.com", status: "pending", name: null });

    const bob = await createUserWithPassword(db, { name: "Bob", email: "bob@example.com", password: "12345678" });
    const list = await listDocuments(db, bob);
    expect(list.shared.map((x) => [x.id, x.role])).toEqual([[d.id, "viewer"]]);
    expect((await listShares(db, a, d.id)).shares[0].status).toBe("active");
  });

  it("rejects sharing with yourself (SELF_SHARE)", async () => {
    const d = await createDocument(db, a);
    await expect(createShare(db, a, d.id, { email: "A@x.com", role: "viewer" })).rejects.toMatchObject({ code: "SELF_SHARE" });
  });

  it("rejects a duplicate share (ALREADY_SHARED)", async () => {
    const d = await createDocument(db, a);
    await createShare(db, a, d.id, { email: "c@x.com", role: "viewer" });
    await expect(createShare(db, a, d.id, { email: "C@x.com", role: "editor" })).rejects.toMatchObject({ code: "ALREADY_SHARED" });
  });

  it("only the owner manages shares — editor gets FORBIDDEN, stranger NOT_FOUND", async () => {
    const b = await makeUser(db, "b@x.com");
    const c = await makeUser(db, "c@x.com");
    const d = await createDocument(db, a);
    await createShare(db, a, d.id, { email: b.email, role: "editor" });
    await expect(createShare(db, b, d.id, { email: "z@x.com", role: "viewer" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listShares(db, b, d.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listShares(db, c, d.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("revoking access makes the doc NOT_FOUND for get and update", async () => {
    const b = await makeUser(db, "b@x.com");
    const d = await createDocument(db, a);
    const s = await createShare(db, a, d.id, { email: b.email, role: "editor" });
    await deleteShare(db, a, d.id, s.id);
    await expect(getDocument(db, b, d.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(updateDocument(db, b, d.id, { content, version: 1 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("downgrading editor → viewer makes the next content update FORBIDDEN", async () => {
    const b = await makeUser(db, "b@x.com");
    const d = await createDocument(db, a);
    const s = await createShare(db, a, d.id, { email: b.email, role: "editor" });
    const u = await updateShare(db, a, d.id, s.id, { role: "viewer" });
    expect(u.role).toBe("viewer");
    await expect(updateDocument(db, b, d.id, { content, version: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("share ids from another document are NOT_FOUND", async () => {
    const d1 = await createDocument(db, a);
    const d2 = await createDocument(db, a);
    const s = await createShare(db, a, d1.id, { email: "c@x.com", role: "viewer" });
    await expect(updateShare(db, a, d2.id, s.id, { role: "editor" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteShare(db, a, d2.id, s.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteShare(db, a, d2.id, "garbage")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deleting a document cascades its shares", async () => {
    const d = await createDocument(db, a);
    await createShare(db, a, d.id, { email: "c@x.com", role: "viewer" });
    await deleteDocument(db, a, d.id);
    expect(await db.select().from(documentShares).where(eq(documentShares.documentId, d.id))).toEqual([]);
  });
});
