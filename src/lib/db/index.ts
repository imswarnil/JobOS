import { neon, neonConfig } from "@neondatabase/serverless";
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

/** How many times to retry, and how long to wait before each. */
const RETRY_DELAYS_MS = [150, 500, 1200];

/**
 * Errors worth retrying: the connection never got established.
 *
 * Deliberately narrow. A timeout or a refused connection is a fact about the
 * network and the same query will very likely succeed a moment later. A
 * constraint violation or a syntax error is a fact about the query, and
 * retrying it just produces the same failure three times more slowly.
 */
function isTransient(error: unknown): boolean {
  const message = String(
    (error as { cause?: { code?: string } })?.cause?.code ??
      (error as Error)?.message ??
      error,
  );
  return (
    /UND_ERR_CONNECT_TIMEOUT|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|socket hang up|fetch failed/i.test(
      message,
    ) ||
    /fetch failed|Connect Timeout/i.test(String(error))
  );
}

/**
 * A fetch that retries transient connection failures.
 *
 * Neon's HTTP endpoint occasionally refuses to connect within undici's
 * default window — observed repeatedly in development, several seconds of
 * latency followed by UND_ERR_CONNECT_TIMEOUT. Without this, a single blip
 * turns an ordinary page load into a 500, which is a miserable trade for
 * something a 150ms wait usually fixes.
 *
 * Safe because every query this driver sends is a single statement over HTTP:
 * a request that never connected cannot have been applied, so replaying it
 * cannot double-write.
 */
const retryingFetch: typeof fetch = async (input, init) => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === RETRY_DELAYS_MS.length) break;
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }

  throw lastError;
};

/**
 * Lazily constructed: reading the env var at module scope would break the
 * build, because Next evaluates imported modules while prerendering.
 */
let client: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!client) {
    // Global rather than per-connection: the driver exposes the fetch hook on
    // neonConfig, not in the connection options. Set once, alongside the
    // single client this module creates.
    neonConfig.fetchFunction = retryingFetch;
    client = drizzle(neon(connectionString()), { schema });
  }
  return client;
}

export { schema };
export type Db = ReturnType<typeof getDb>;
