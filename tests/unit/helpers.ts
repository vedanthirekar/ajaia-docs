import { documentShares, documents, users } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

export async function makeUser(db: Db, email: string, name = email.split("@")[0]) {
  const [u] = await db.insert(users).values({ email, name }).returning();
  return { id: u.id, email: u.email!, name: u.name! };
}

export async function makeDoc(db: Db, ownerId: string, title = "Doc") {
  const [d] = await db.insert(documents).values({ ownerId, title }).returning();
  return d;
}

export async function makeShare(
  db: Db,
  documentId: string,
  email: string,
  role: "viewer" | "editor",
  userId: string | null = null,
) {
  const [s] = await db.insert(documentShares).values({ documentId, email, role, userId }).returning();
  return s;
}
