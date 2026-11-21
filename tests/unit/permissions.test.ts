import { beforeEach, describe, expect, it } from "vitest";
import { assertCan, can, getRole, type Action, type Role } from "@/lib/permissions";
import { createTestDb } from "@/lib/db/test-db";
import type { Db } from "@/lib/db/types";
import { makeDoc, makeShare, makeUser } from "./helpers";

const matrix: Record<string, Action[]> = {
  owner: ["view", "edit", "rename", "share", "delete"],
  editor: ["view", "edit", "rename"],
  viewer: ["view"],
  none: [],
};
const ALL: Action[] = ["view", "edit", "rename", "share", "delete"];

describe("can()", () => {
  for (const [roleKey, allowed] of Object.entries(matrix)) {
    const role = (roleKey === "none" ? null : roleKey) as Role | null;
    for (const action of ALL) {
      const expected = allowed.includes(action);
      it(`${roleKey} ${expected ? "can" : "cannot"} ${action}`, () => {
        expect(can(role, action)).toBe(expected);
      });
    }
  }
});

describe("getRole() / assertCan()", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
  });

  it("owner gets 'owner'", async () => {
    const a = await makeUser(db, "a@x.com");
    const d = await makeDoc(db, a.id);
    expect(await getRole(db, a, d.id)).toBe("owner");
  });

  it("share by userId gets its role", async () => {
    const a = await makeUser(db, "a@x.com");
    const b = await makeUser(db, "b@x.com");
    const d = await makeDoc(db, a.id);
    await makeShare(db, d.id, "b@x.com", "editor", b.id);
    expect(await getRole(db, b, d.id)).toBe("editor");
  });

  it("pending share by email gets its role", async () => {
    const a = await makeUser(db, "a@x.com");
    const b = await makeUser(db, "b@x.com");
    const d = await makeDoc(db, a.id);
    await makeShare(db, d.id, "b@x.com", "viewer", null);
    expect(await getRole(db, b, d.id)).toBe("viewer");
  });

  it("unrelated user gets null", async () => {
    const a = await makeUser(db, "a@x.com");
    const c = await makeUser(db, "c@x.com");
    const d = await makeDoc(db, a.id);
    expect(await getRole(db, c, d.id)).toBeNull();
  });

  it("non-uuid doc id gets null rather than throwing", async () => {
    const a = await makeUser(db, "a@x.com");
    expect(await getRole(db, a, "not-a-uuid")).toBeNull();
  });

  it("missing doc gets null", async () => {
    const a = await makeUser(db, "a@x.com");
    expect(await getRole(db, a, "00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  it("assertCan: viewer editing → FORBIDDEN", async () => {
    const a = await makeUser(db, "a@x.com");
    const b = await makeUser(db, "b@x.com");
    const d = await makeDoc(db, a.id);
    await makeShare(db, d.id, "b@x.com", "viewer", b.id);
    await expect(assertCan(db, b, d.id, "edit")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("assertCan: stranger viewing → NOT_FOUND", async () => {
    const a = await makeUser(db, "a@x.com");
    const c = await makeUser(db, "c@x.com");
    const d = await makeDoc(db, a.id);
    await expect(assertCan(db, c, d.id, "view")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("assertCan returns the role when allowed", async () => {
    const a = await makeUser(db, "a@x.com");
    const d = await makeDoc(db, a.id);
    expect(await assertCan(db, a, d.id, "delete")).toBe("owner");
  });
});
