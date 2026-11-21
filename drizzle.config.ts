import { config } from "dotenv";
import { mkdirSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const url = process.env.DATABASE_URL ?? "";
const isPglite = url.startsWith("pglite:");
if (isPglite) mkdirSync(url.slice("pglite:".length), { recursive: true });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  ...(isPglite
    ? { driver: "pglite" as const, dbCredentials: { url: url.slice("pglite:".length) } }
    : { dbCredentials: { url } }),
});
