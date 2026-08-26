import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/lib/db/schema";

/**
 * The database client.
 *
 * `neon-http` rather than the WebSocket pool: every JobOS query is a short,
 * self-contained request, which is what the HTTP driver is fastest at, and it
 * works unchanged on both the Node and edge runtimes.
 *
 * Uses the *pooled* connection string. Migrations deliberately use the direct
 * one instead — see drizzle.config.ts.
 *
 * TODO(Phase 4): if a batch import ever needs a real transaction, swap to
 * `drizzle-orm/neon-serverless` with a Pool. The query code does not change.
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
 * build, because Next evaluates imported modules while prerendering.
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
