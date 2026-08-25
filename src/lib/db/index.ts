import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/lib/db/schema";

/**
 * The database client.
 *
 * `neon-http` rather than the WebSocket pool: every JobOS query is a short,
 * self-contained request, which is exactly what the HTTP driver is fastest
 * at, and it works unchanged on Vercel's edge and Node runtimes.
 *
 * Nothing calls this in Phase 0 — no screen touches the database yet. It is
 * here so that the first feature query has somewhere to import from, and so
 * that a missing DATABASE_URL fails loudly at that point rather than
 * silently returning nothing.
 *
 * TODO(Phase 4): if a batch import ever needs a transaction, swap to
 * `drizzle-orm/neon-serverless` with a Pool — the query code does not change.
 */
function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and paste your Neon connection string.",
    );
  }
  return url;
}

/**
 * Lazily constructed: reading the env var at module scope would break the
 * build, because Next evaluates imported modules while prerendering and there
 * is no database configured yet.
 */
let client: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!client) {
    client = drizzle(neon(connectionString()), { schema });
  }
  return client;
}

export { schema };
export type Db = ReturnType<typeof getDb>;
