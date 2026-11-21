import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import type { Db } from "./types";

export type { Db } from "./types";

let _db: Db | undefined;

/** Lazily created so builds don't require DATABASE_URL. */
export function getDb(): Db {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _db = drizzle(neon(url), { schema }) as unknown as Db;
  }
  return _db;
}
