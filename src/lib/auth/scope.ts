import { requireUser } from "@/lib/auth";

/**
 * OWNERSHIP SCOPING
 * =================
 *
 * No domain query may run without a user id attached. `scope()` is the only
 * sanctioned source of that id, so there is one line to audit rather than a
 * hundred call sites to trust.
 *
 * The rule: never write `db.select().from(workLog)`. Write
 * `db.select().from(workLog).where(eq(workLog.ownerId, await ownerId()))`.
 *
 * Postgres backs this up — `owner_id` is a real foreign key to
 * `neon_auth.user.id` (drizzle/0001), so a row cannot be orphaned or forged
 * to point at a user who does not exist.
 *
 * TODO(Phase 6): Neon Auth already ships the Better Auth organization plugin
 * (`neon_auth.organization` / `member` exist and are enabled). When teams
 * arrive, this returns `{ ownerId, organizationId }` from
 * `session.activeOrganizationId`, and callers that destructure it keep
 * working unchanged.
 */

export interface Scope {
  ownerId: string;
  // TODO(Phase 6): organizationId?: string;
}

/** Throws (via redirect) if nobody is signed in — callers get a real id. */
export async function scope(): Promise<Scope> {
  const user = await requireUser();
  return { ownerId: user.id };
}

/** Shorthand for the common case of needing just the id. */
export async function ownerId(): Promise<string> {
  return (await scope()).ownerId;
}
