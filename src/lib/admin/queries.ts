import "server-only";

import { count, eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { application, company, job, project, workLog } from "@/lib/db/schema";
import { authSession, authUser } from "@/lib/db/neon-auth";

/**
 * The operator's numbers.
 *
 * Deliberately instance-wide rather than owner-scoped — that is the point of
 * an admin screen, and it is the one place `scope()` does not apply. Which
 * means the *route* is what has to be gated; see the note on the Admin page.
 */
export async function instanceStats() {
  const db = getDb();

  const [[users], [sessions], [logs], [companies], [projects], [jobs], [apps]] =
    await Promise.all([
      db.select({ n: count() }).from(authUser),
      db
        .select({ n: count() })
        .from(authSession)
        .where(sql`${authSession.expiresAt} > now()`),
      db.select({ n: count() }).from(workLog),
      db.select({ n: count() }).from(company),
      db.select({ n: count() }).from(project),
      db.select({ n: count() }).from(job),
      db.select({ n: count() }).from(application),
    ]);

  const domainRows =
    Number(logs.n) +
    Number(companies.n) +
    Number(projects.n) +
    Number(jobs.n) +
    Number(apps.n);

  return {
    users: Number(users.n),
    activeSessions: Number(sessions.n),
    workLogs: Number(logs.n),
    domainRows,
  };
}

/**
 * Every account on this instance, oldest first, with how much each has logged.
 *
 * A LEFT JOIN and GROUP BY rather than a correlated subquery: interpolating a
 * Drizzle column into a raw `sql` fragment inside a subquery does not
 * correlate the way it reads — it silently returned 0 for every user.
 * `count(workLog.id)` counts non-null rows, so an account with no entries
 * correctly yields 0 rather than 1.
 */
export async function listUsers() {
  const db = getDb();

  return db
    .select({
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      role: authUser.role,
      emailVerified: authUser.emailVerified,
      createdAt: authUser.createdAt,
      logCount: count(workLog.id),
    })
    .from(authUser)
    .leftJoin(workLog, eq(workLog.ownerId, authUser.id))
    .groupBy(
      authUser.id,
      authUser.name,
      authUser.email,
      authUser.role,
      authUser.emailVerified,
      authUser.createdAt,
    )
    .orderBy(authUser.createdAt)
    .limit(50);
}
