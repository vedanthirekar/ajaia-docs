import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import type { Db } from "@/lib/db/types";
import { assertCan, getRole } from "@/lib/permissions";
import {
  createDocument,
  getDocument,
  listDocuments,
  setVisibility,
  updateDocument,
} from "@/lib/services/documents";
import { createShare, listShares } from "@/lib/services/shares";
import { makeUser } from "./helpers";

describe("public link visibility", () => {
  let db: Db;
  let owner: Awaited<ReturnType<typeof makeUser>>;
  let stranger: Awaited<ReturnType<typeof makeUser>>;
  beforeEach(async () => {
    db = await createTestDb();
    owner = await makeUser(db, "owner@x.com", "Owner");
    stranger = await makeUser(db, "stranger@x.com", "Stranger");
  });

  it("documents are private by default", async () => {
    const d = await createDocument(db, owner);
    expect(d.isPublic).toBe(false);
    expect(await getRole(db, null, d.id)).toBeNull();
    expect(await getRole(db, stranger, d.id)).toBeNull();
  });

  it("a public doc is viewable by anonymous visitors and signed-in strangers, read-only", async () => {
    const d = await createDocument(db, owner);
    await setVisibility(db, owner, d.id, true);
    expect(await getRole(db, null, d.id)).toBe("viewer");
    expect(await getRole(db, stranger, d.id)).toBe("viewer");

    const anon = await getDocument(db, null, d.id);
    expect(anon).toMatchObject({ id: d.id, role: "viewer", isPublic: true });
    await expect(assertCan(db, null, d.id, "edit")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(updateDocument(db, stranger, d.id, { title: "x", version: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("making a doc public never downgrades people who were explicitly shared", async () => {
    const editor = await makeUser(db, "editor@x.com");
    const d = await createDocument(db, owner);
    await createShare(db, owner, d.id, { email: editor.email, role: "editor" });
    await setVisibility(db, owner, d.id, true);
    expect(await getRole(db, editor, d.id)).toBe("editor");
    expect(await getRole(db, owner, d.id)).toBe("owner");
  });

  it("turning the link off removes anonymous access again (404, not 403)", async () => {
    const d = await createDocument(db, owner);
    await setVisibility(db, owner, d.id, true);
    await setVisibility(db, owner, d.id, false);
    await expect(getDocument(db, null, d.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getDocument(db, stranger, d.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("only the owner can change visibility", async () => {
    const editor = await makeUser(db, "editor@x.com");
    const d = await createDocument(db, owner);
    await createShare(db, owner, d.id, { email: editor.email, role: "editor" });
    await expect(setVisibility(db, editor, d.id, true)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(setVisibility(db, stranger, d.id, true)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("changing visibility does not bump the version (no false conflicts for open editors)", async () => {
    const d = await createDocument(db, owner);
    await setVisibility(db, owner, d.id, true);
    expect((await getDocument(db, owner, d.id)).version).toBe(1);
    await expect(updateDocument(db, owner, d.id, { title: "still v1", version: 1 })).resolves.toMatchObject({
      version: 2,
    });
  });

  it("public docs don't appear in strangers' 'Shared with me', and the owner list flags them", async () => {
    const d = await createDocument(db, owner);
    await setVisibility(db, owner, d.id, true);
    expect((await listDocuments(db, stranger)).shared).toEqual([]);
    expect((await listDocuments(db, owner)).owned[0].isPublic).toBe(true);
  });

  it("the owner's share listing reports the current visibility", async () => {
    const d = await createDocument(db, owner);
    await setVisibility(db, owner, d.id, true);
    expect((await listShares(db, owner, d.id)).isPublic).toBe(true);
  });
});
