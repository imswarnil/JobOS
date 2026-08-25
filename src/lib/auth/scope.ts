import { getCurrentUser } from "@/lib/auth";

/**
 * OWNERSHIP SCOPING
 * =================
 *
 * SaaS-readiness rule #2: no domain query may run without a user id attached.
 * JobOS has exactly one user today, which is precisely why this helper exists
 * now — a single-user app that queries unscoped grows a hundred unscoped
 * queries, and every one of them is a data leak on the day a second user
 * signs up.
 *
 * The rule: never write `db.select().from(workLog)` in a feature. Write
 * `db.select().from(workLog).where(eq(workLog.ownerId, await ownerId()))`.
 *
 * TODO(Phase 6): when organizations arrive, this is the one place that learns
 * about them — `scope()` starts returning `{ ownerId, organizationId }` and
 * the feature code that destructures it keeps working unchanged.
 */

export interface Scope {
  ownerId: string;
  // TODO(Phase 6): organizationId?: string;
}

/** The scope every domain read and write must be filtered by. */
export async function scope(): Promise<Scope> {
  const user = await getCurrentUser();
  return { ownerId: user.id };
}

/** Shorthand for the common case of needing just the id. */
export async function ownerId(): Promise<string> {
  return (await scope()).ownerId;
}
