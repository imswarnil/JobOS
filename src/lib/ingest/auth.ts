import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * MACHINE INGEST — the one place a write does not come from a session
 * ==================================================================
 *
 * JobOS's rule is that writes are server actions and the owner comes from the
 * session, never from the request. The discovery runner cannot obey that: it
 * is an n8n workflow on a VPS, running on a schedule, with nobody signed in.
 *
 * So this is the deliberate exception, and it is kept narrow on purpose:
 *
 *   - One shared secret, `INGEST_TOKEN`, compared in constant time.
 *   - One account, `INGEST_OWNER_ID`, fixed in the environment. The owner is
 *     *never* read from the request body, so a leaked token can only write
 *     into the account it was issued for — it cannot be pointed at another.
 *   - Only two endpoints accept it, and both are under /api/ingest.
 *
 * If this ever needs to serve more than one account, the replacement is a
 * per-owner token row in the database, not an `ownerId` field in the payload.
 *
 * Why not run discovery inside Next instead and skip all this: a crawl plus a
 * local model comfortably exceeds a Vercel function's execution limit, and
 * neither Crawl4AI nor Ollama is reachable from Vercel without being exposed
 * publicly anyway. The work belongs on the box that already hosts them.
 */

export class IngestAuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 500,
  ) {
    super(message);
    this.name = "IngestAuthError";
  }
}

/** Constant-time, and length-safe — `timingSafeEqual` throws on a mismatch. */
function secretsMatch(presented: string, expected: string): boolean {
  const a = Buffer.from(presented, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Verifies the bearer token and returns the account it writes for.
 *
 * A missing or short `INGEST_TOKEN` is a 500 rather than a 401: the endpoint
 * is misconfigured, and answering 401 would let a caller mistake "this server
 * has no secret set" for "your token is wrong".
 */
export function requireIngestOwner(request: Request): string {
  const expected = process.env.INGEST_TOKEN;
  const owner = process.env.INGEST_OWNER_ID;

  if (!expected || expected.length < 32) {
    throw new IngestAuthError(
      "INGEST_TOKEN is unset or too short — ingest is disabled.",
      500,
    );
  }
  if (!owner) {
    throw new IngestAuthError("INGEST_OWNER_ID is not set.", 500);
  }

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!presented || !secretsMatch(presented, expected)) {
    throw new IngestAuthError("Invalid or missing bearer token.", 401);
  }

  return owner;
}
