import "server-only";

import { and, count, desc, eq, gte, ilike, or, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { company, project, workLog, type LogType } from "@/lib/db/schema";
import { ownerId } from "@/lib/auth/scope";

/**
 * Every read in this file is scoped by `owner_id`. There is no unscoped
 * query, and there should never be one — see lib/auth/scope.ts.
 */

export interface JournalFilter {
  type?: LogType;
  /** Free text across title, body and impact. */
  q?: string;
  companyId?: string;
  limit?: number;
}

export type JournalEntry = Awaited<ReturnType<typeof listEntries>>[number];

export async function listEntries(filter: JournalFilter = {}) {
  const db = getDb();
  const owner = await ownerId();

  const where = [eq(workLog.ownerId, owner)];
  if (filter.type) where.push(eq(workLog.type, filter.type));
  if (filter.companyId) where.push(eq(workLog.companyId, filter.companyId));
  if (filter.q?.trim()) {
    const needle = `%${filter.q.trim()}%`;
    const match = or(
      ilike(workLog.title, needle),
      ilike(workLog.body, needle),
      ilike(workLog.impact, needle),
    );
    // `or()` is only undefined when given no arguments; it never is here.
    if (match) where.push(match);
  }

  return db
    .select({
      id: workLog.id,
      type: workLog.type,
      occurredOn: workLog.occurredOn,
      title: workLog.title,
      body: workLog.body,
      challenges: workLog.challenges,
      impact: workLog.impact,
      techTags: workLog.techTags,
      tags: workLog.tags,
      minutesSpent: workLog.minutesSpent,
      createdAt: workLog.createdAt,
      companyId: workLog.companyId,
      companyName: company.name,
      projectId: workLog.projectId,
      projectName: project.name,
    })
    .from(workLog)
    .leftJoin(company, eq(workLog.companyId, company.id))
    .leftJoin(project, eq(workLog.projectId, project.id))
    .where(and(...where))
    .orderBy(desc(workLog.occurredOn), desc(workLog.createdAt))
    .limit(filter.limit ?? 100);
}

/** Entry counts per type, for the filter chips. Zero-filled by the caller. */
export async function countsByType(): Promise<Record<string, number>> {
  const db = getDb();
  const owner = await ownerId();

  const rows = await db
    .select({ type: workLog.type, n: count() })
    .from(workLog)
    .where(eq(workLog.ownerId, owner))
    .groupBy(workLog.type);

  return Object.fromEntries(rows.map((r) => [r.type, Number(r.n)]));
}

export async function listCompanies() {
  const db = getDb();
  const owner = await ownerId();

  return db
    .select({ id: company.id, name: company.name })
    .from(company)
    .where(eq(company.ownerId, owner))
    .orderBy(company.name);
}

export async function listProjects() {
  const db = getDb();
  const owner = await ownerId();

  return db
    .select({ id: project.id, name: project.name, companyId: project.companyId })
    .from(project)
    .where(eq(project.ownerId, owner))
    .orderBy(project.name);
}

/**
 * The dashboard's numbers.
 *
 * The streak is computed in SQL rather than by pulling every row into Node:
 * number each distinct day, subtract that number from the date, and every
 * consecutive day collapses to the same value. The size of the group
 * containing today (or yesterday, so the streak survives until you have had a
 * chance to write) is the current streak.
 */
export async function dashboardStats() {
  const db = getDb();
  const owner = await ownerId();

  const [totals] = await db
    .select({ total: count() })
    .from(workLog)
    .where(eq(workLog.ownerId, owner));

  const [week] = await db
    .select({ n: count() })
    .from(workLog)
    .where(
      and(
        eq(workLog.ownerId, owner),
        gte(workLog.occurredOn, sql`current_date - interval '7 days'`),
      ),
    );

  const streakRows = await db.execute(sql`
    WITH days AS (
      SELECT DISTINCT occurred_on AS d
      FROM work_log
      WHERE owner_id = ${owner}
    ),
    grouped AS (
      SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d))::int AS run
      FROM days
    )
    SELECT count(*)::int AS streak
    FROM grouped
    WHERE run = (
      SELECT run FROM grouped
      WHERE d IN (current_date, current_date - 1)
      ORDER BY d DESC
      LIMIT 1
    )
  `);

  const streak = Number(
    (streakRows.rows?.[0] as { streak?: number } | undefined)?.streak ?? 0,
  );

  return {
    totalEntries: Number(totals?.total ?? 0),
    entriesThisWeek: Number(week?.n ?? 0),
    streak,
  };
}
