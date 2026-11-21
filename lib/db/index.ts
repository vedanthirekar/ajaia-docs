import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import type { Db } from "./types";

export type { Db } from "./types";

let _db: Db | undefined;

/**
 * Lazily created so builds don't require DATABASE_URL.
 * - `postgres://…` / `postgresql://…` → Neon serverless (production)
 * - `pglite:<dir>` → embedded file-backed Postgres for zero-setup local dev
 */
export function getDb(): Db {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");

  if (url.startsWith("pglite:")) {
    // PGlite is an in-process database: two instances on the same directory don't
    // see each other's writes. Next dev loads route handlers and server components
    // as separate module copies, so keep ONE instance per process on globalThis.
    const g = globalThis as unknown as { __ajaiaPglite?: Db };
    if (!g.__ajaiaPglite) {
      // Loaded lazily so the production (Neon) path never touches PGlite.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PGlite } = require("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { drizzle } = require("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
      g.__ajaiaPglite = drizzle(new PGlite(url.slice("pglite:".length)), { schema }) as unknown as Db;
    }
    _db = g.__ajaiaPglite;
  } else {
    _db = drizzleNeon(neon(url), { schema }) as unknown as Db;
  }
  return _db;
}
