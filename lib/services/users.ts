import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { documentShares, users } from "../db/schema";
import { isUniqueViolation } from "../db/errors";
import type { Db } from "../db/types";
import { AppError } from "../errors";

export type User = { id: string; email: string; name: string };

const BCRYPT_COST = 10;
const normalize = (email: string) => email.trim().toLowerCase();

function toUser(row: { id: string; email: string | null; name: string | null }): User {
  const email = row.email ?? "";
  return { id: row.id, email, name: row.name ?? email.split("@")[0] };
}

export async function createUserWithPassword(
  db: Db,
  input: { name: string; email: string; password: string },
): Promise<User> {
  const email = normalize(input.email);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) throw new AppError("EMAIL_TAKEN", "An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  let row;
  try {
    [row] = await db.insert(users).values({ name: input.name.trim(), email, passwordHash }).returning();
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("EMAIL_TAKEN", "An account with this email already exists");
    throw e;
  }
  await claimPendingShares(db, row.id, email);
  return toUser(row);
}

export async function verifyCredentials(db: Db, email: string, password: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.email, normalize(email))).limit(1);
  if (!row?.passwordHash) return null;
  const ok = await bcrypt.compare(password, row.passwordHash);
  return ok ? toUser(row) : null;
}

/** Attach pending (email-addressed) shares to the now-known user. Returns rows claimed. */
export async function claimPendingShares(db: Db, userId: string, email: string): Promise<number> {
  const claimed = await db
    .update(documentShares)
    .set({ userId })
    .where(and(eq(documentShares.email, normalize(email)), isNull(documentShares.userId)))
    .returning({ id: documentShares.id });
  return claimed.length;
}
