import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import type { Db } from "@/lib/db/types";
import { documentShares, users } from "@/lib/db/schema";
import { claimPendingShares, createUserWithPassword, verifyCredentials } from "@/lib/services/users";
import { makeDoc, makeShare, makeUser } from "./helpers";

describe("users service", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
  });

  it("stores a lowercased email and a bcrypt hash, never the plaintext", async () => {
    const u = await createUserWithPassword(db, { name: "Ann", email: " Ann@X.com ", password: "correct horse" });
    expect(u.email).toBe("ann@x.com");
    const [row] = await db.select().from(users).where(eq(users.id, u.id));
    expect(row.passwordHash).toBeTruthy();
    expect(row.passwordHash).not.toBe("correct horse");
    expect(row.passwordHash!.startsWith("$2")).toBe(true);
  });

  it("rejects a duplicate email in a different case with EMAIL_TAKEN", async () => {
    await createUserWithPassword(db, { name: "Ann", email: "ann@x.com", password: "12345678" });
    await expect(
      createUserWithPassword(db, { name: "Ann2", email: "ANN@x.com", password: "12345678" }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("rejects signup for an email already used by a Google-only account", async () => {
    await makeUser(db, "g@x.com"); // no passwordHash — created via OAuth
    await expect(
      createUserWithPassword(db, { name: "G", email: "g@x.com", password: "12345678" }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("verifyCredentials returns the user for the right password (any email case)", async () => {
    const u = await createUserWithPassword(db, { name: "Ann", email: "ann@x.com", password: "12345678" });
    expect(await verifyCredentials(db, "ANN@x.com", "12345678")).toEqual({ id: u.id, email: "ann@x.com", name: "Ann" });
  });

  it("verifyCredentials returns null for wrong password, unknown email, or OAuth-only user", async () => {
    await createUserWithPassword(db, { name: "Ann", email: "ann@x.com", password: "12345678" });
    await makeUser(db, "g@x.com");
    expect(await verifyCredentials(db, "ann@x.com", "wrongpass")).toBeNull();
    expect(await verifyCredentials(db, "nobody@x.com", "12345678")).toBeNull();
    expect(await verifyCredentials(db, "g@x.com", "12345678")).toBeNull();
  });

  it("signup claims pending shares addressed to that email", async () => {
    const owner = await makeUser(db, "owner@x.com");
    const d = await makeDoc(db, owner.id);
    await makeShare(db, d.id, "new@x.com", "viewer", null);
    const u = await createUserWithPassword(db, { name: "New", email: "New@X.com", password: "12345678" });
    const [s] = await db.select().from(documentShares).where(eq(documentShares.documentId, d.id));
    expect(s.userId).toBe(u.id);
  });

  it("claimPendingShares only claims unclaimed rows and returns the count", async () => {
    const owner = await makeUser(db, "owner@x.com");
    const b = await makeUser(db, "b@x.com");
    const d1 = await makeDoc(db, owner.id);
    const d2 = await makeDoc(db, owner.id);
    await makeShare(db, d1.id, "b@x.com", "viewer", null);
    await makeShare(db, d2.id, "b@x.com", "editor", b.id);
    expect(await claimPendingShares(db, b.id, "B@x.com")).toBe(1);
  });
});
