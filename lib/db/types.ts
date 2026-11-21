import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/** Driver-agnostic database handle (neon-http in prod, PGlite in tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
