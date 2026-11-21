import { and, asc, eq } from "drizzle-orm";
import { documentShares, documents, users } from "../db/schema";
import { isUniqueViolation } from "../db/errors";
import type { Db } from "../db/types";
import { AppError } from "../errors";
import { assertCan, isUuid } from "../permissions";
import type { User } from "./users";

export type ShareRole = "viewer" | "editor";
export type ShareView = {
  id: string;
  email: string;
  role: ShareRole;
  status: "active" | "pending";
  name: string | null;
};

const notFound = () => new AppError("NOT_FOUND", "Share not found");

async function loadShareViews(db: Db, docId: string, shareId?: string): Promise<ShareView[]> {
  const rows = await db
    .select({
      id: documentShares.id,
      email: documentShares.email,
      role: documentShares.role,
      userName: users.name,
      userId: users.id,
    })
    .from(documentShares)
    // A share is active once an account with that email exists (claimed or not yet).
    .leftJoin(users, eq(users.email, documentShares.email))
    .where(
      shareId
        ? and(eq(documentShares.documentId, docId), eq(documentShares.id, shareId))
        : eq(documentShares.documentId, docId),
    )
    .orderBy(asc(documentShares.createdAt));
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    status: r.userId ? "active" : "pending",
    name: r.userId ? (r.userName ?? null) : null,
  }));
}

export async function listShares(db: Db, user: User, docId: string): Promise<ShareView[]> {
  await assertCan(db, user, docId, "share");
  return loadShareViews(db, docId);
}

export async function createShare(
  db: Db,
  user: User,
  docId: string,
  input: { email: string; role: ShareRole },
): Promise<ShareView> {
  await assertCan(db, user, docId, "share");
  const email = input.email.trim().toLowerCase();

  const [doc] = await db
    .select({ ownerEmail: users.email })
    .from(documents)
    .innerJoin(users, eq(users.id, documents.ownerId))
    .where(eq(documents.id, docId));
  if (doc?.ownerEmail === email) throw new AppError("SELF_SHARE", "You already own this document");

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  let row;
  try {
    [row] = await db
      .insert(documentShares)
      .values({ documentId: docId, email, role: input.role, userId: existingUser?.id ?? null })
      .returning({ id: documentShares.id });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("ALREADY_SHARED", "This document is already shared with that email");
    throw e;
  }
  const [view] = await loadShareViews(db, docId, row.id);
  return view;
}

export async function updateShare(
  db: Db,
  user: User,
  docId: string,
  shareId: string,
  input: { role: ShareRole },
): Promise<ShareView> {
  await assertCan(db, user, docId, "share");
  if (!isUuid(shareId)) throw notFound();
  const updated = await db
    .update(documentShares)
    .set({ role: input.role })
    .where(and(eq(documentShares.id, shareId), eq(documentShares.documentId, docId)))
    .returning({ id: documentShares.id });
  if (updated.length === 0) throw notFound();
  const [view] = await loadShareViews(db, docId, shareId);
  return view;
}

export async function deleteShare(db: Db, user: User, docId: string, shareId: string): Promise<void> {
  await assertCan(db, user, docId, "share");
  if (!isUuid(shareId)) throw notFound();
  const deleted = await db
    .delete(documentShares)
    .where(and(eq(documentShares.id, shareId), eq(documentShares.documentId, docId)))
    .returning({ id: documentShares.id });
  if (deleted.length === 0) throw notFound();
}
