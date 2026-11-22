import { and, eq, or } from "drizzle-orm";
import { documentShares, documents } from "./db/schema";
import type { Db } from "./db/types";
import { AppError } from "./errors";

export type Role = "owner" | "editor" | "viewer";
export type Action = "view" | "edit" | "rename" | "share" | "delete";
export type SessionUser = { id: string; email: string };

const ALLOWED: Record<Role, ReadonlySet<Action>> = {
  owner: new Set(["view", "edit", "rename", "share", "delete"]),
  editor: new Set(["view", "edit", "rename"]),
  viewer: new Set(["view"]),
};

/** Pure permission matrix — the single source of truth for who may do what. */
export function can(role: Role | null, action: Action): boolean {
  return role !== null && ALLOWED[role].has(action);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

/**
 * Resolve a user's role on a document. Shares match by user id OR by email, so a
 * pending invite grants access before it is claimed. A public ("anyone with the
 * link") document gives everyone else — including anonymous visitors (`user` null)
 * — the viewer role; explicit roles always win.
 */
export async function getRole(db: Db, user: SessionUser | null, docId: string): Promise<Role | null> {
  if (!isUuid(docId)) return null;

  const [doc] = await db
    .select({ ownerId: documents.ownerId, isPublic: documents.isPublic })
    .from(documents)
    .where(eq(documents.id, docId))
    .limit(1);
  if (!doc) return null;

  if (user) {
    if (doc.ownerId === user.id) return "owner";
    const [share] = await db
      .select({ role: documentShares.role })
      .from(documentShares)
      .where(
        and(
          eq(documentShares.documentId, docId),
          or(eq(documentShares.userId, user.id), eq(documentShares.email, user.email.toLowerCase())),
        ),
      )
      .limit(1);
    if (share) return share.role;
  }
  return doc.isPublic ? "viewer" : null;
}

/**
 * Throws NOT_FOUND when the user has no access at all (hides existence),
 * FORBIDDEN when they have a role that doesn't permit the action.
 */
export async function assertCan(
  db: Db,
  user: SessionUser | null,
  docId: string,
  action: Action,
): Promise<Role> {
  const role = await getRole(db, user, docId);
  if (role === null) throw new AppError("NOT_FOUND", "Document not found");
  if (!can(role, action)) {
    throw new AppError("FORBIDDEN", "You don't have permission to do that on this document");
  }
  return role;
}
