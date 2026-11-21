import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { documentShares, documents, users, type DocContent } from "../db/schema";
import type { Db } from "../db/types";
import { AppError } from "../errors";
import { assertCan, type Role } from "../permissions";
import type { User } from "./users";

export type DocSummary = {
  id: string;
  title: string;
  updatedAt: Date;
  role: Role;
  ownerName: string;
  ownerEmail: string;
};
export type DocDetail = DocSummary & { content: DocContent; version: number };

const ownerName = (o: { name: string | null; email: string | null }) => o.name ?? o.email?.split("@")[0] ?? "Unknown";

const summaryCols = {
  id: documents.id,
  title: documents.title,
  updatedAt: documents.updatedAt,
  ownerName: users.name,
  ownerEmail: users.email,
};

export async function listDocuments(db: Db, user: User): Promise<{ owned: DocSummary[]; shared: DocSummary[] }> {
  const ownedRows = await db
    .select(summaryCols)
    .from(documents)
    .innerJoin(users, eq(users.id, documents.ownerId))
    .where(eq(documents.ownerId, user.id))
    .orderBy(desc(documents.updatedAt), desc(documents.createdAt));

  const sharedRows = await db
    .select({ ...summaryCols, role: documentShares.role })
    .from(documentShares)
    .innerJoin(documents, eq(documents.id, documentShares.documentId))
    .innerJoin(users, eq(users.id, documents.ownerId))
    .where(
      and(
        or(eq(documentShares.userId, user.id), eq(documentShares.email, user.email)),
        ne(documents.ownerId, user.id),
      ),
    )
    .orderBy(desc(documents.updatedAt), desc(documents.createdAt));

  const toSummary = (r: (typeof ownedRows)[number], role: Role): DocSummary => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updatedAt,
    role,
    ownerName: ownerName({ name: r.ownerName, email: r.ownerEmail }),
    ownerEmail: r.ownerEmail ?? "",
  });

  const seen = new Set<string>();
  const shared: DocSummary[] = [];
  for (const r of sharedRows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    shared.push(toSummary(r, r.role));
  }
  return { owned: ownedRows.map((r) => toSummary(r, "owner")), shared };
}

async function loadDetail(db: Db, id: string, role: Role): Promise<DocDetail> {
  const [r] = await db
    .select({ ...summaryCols, content: documents.content, version: documents.version })
    .from(documents)
    .innerJoin(users, eq(users.id, documents.ownerId))
    .where(eq(documents.id, id))
    .limit(1);
  if (!r) throw new AppError("NOT_FOUND", "Document not found");
  return {
    id: r.id,
    title: r.title,
    updatedAt: r.updatedAt,
    role,
    ownerName: ownerName({ name: r.ownerName, email: r.ownerEmail }),
    ownerEmail: r.ownerEmail ?? "",
    content: r.content,
    version: r.version,
  };
}

export async function createDocument(
  db: Db,
  user: User,
  input: { title?: string; content?: DocContent } = {},
): Promise<DocDetail> {
  const [row] = await db
    .insert(documents)
    .values({
      ownerId: user.id,
      ...(input.title ? { title: input.title } : {}),
      ...(input.content ? { content: input.content } : {}),
    })
    .returning({ id: documents.id });
  return loadDetail(db, row.id, "owner");
}

export async function getDocument(db: Db, user: User, id: string): Promise<DocDetail> {
  const role = await assertCan(db, user, id, "view");
  return loadDetail(db, id, role);
}

/**
 * Optimistic-concurrency update: succeeds only if `version` matches the stored
 * version, atomically incrementing it. A stale version → VERSION_CONFLICT.
 */
export async function updateDocument(
  db: Db,
  user: User,
  id: string,
  input: { title?: string; content?: DocContent; version: number },
): Promise<DocDetail> {
  // Every role that may edit may also rename, so one check covers both fields.
  const role = await assertCan(db, user, id, input.content !== undefined ? "edit" : "rename");

  const updated = await db
    .update(documents)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      version: sql`${documents.version} + 1`,
      updatedAt: sql`now()`,
    })
    .where(and(eq(documents.id, id), eq(documents.version, input.version)))
    .returning({ id: documents.id });

  if (updated.length === 0) {
    throw new AppError("VERSION_CONFLICT", "This document was changed elsewhere. Reload to see the latest version.");
  }
  return loadDetail(db, id, role);
}

export async function deleteDocument(db: Db, user: User, id: string): Promise<void> {
  await assertCan(db, user, id, "delete");
  await db.delete(documents).where(eq(documents.id, id));
}
