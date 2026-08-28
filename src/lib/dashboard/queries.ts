import "server-only";

import { and, count, desc, eq, gte, isNotNull, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { application, job, resumeMaster, workLog } from "@/lib/db/schema";
import { ownerId } from "@/lib/auth/scope";
import { lintResume } from "@/lib/resume/lint";
import { parseResume } from "@/lib/resume/schema";

/**
 * THE NUMBERS ON THE HOME SCREEN
 * ==============================
 *
 * One query set, one round trip's worth of parallel selects, answering the
 * only question a home screen should: *what is the state of my search, and
 * what should I do next?*
 *
 * Everything here is real. The previous dashboard rendered hard-coded zeros
 * for jobs and applications with a TODO beside them, which is the worst of
 * both worlds — it looks like data, so you read it, and it is not, so you are
 * misled. A number that cannot be computed yet should be absent, not faked.
 */

export interface HomeStats {
  /** Journal */
  entries: number;
  entriesThisWeek: number;
  /** Distinct technologies the journal has ever mentioned. */
  skills: number;

  /** Resume */
  resumeScore: number | null;
  resumeEntries: number;

  /** Pipeline */
  jobsOpen: number;
  jobsStrong: number;
  applied: number;
  interviewing: number;

  /** Days since the last journal entry. Null when there are none. */
  daysSinceLog: number | null;
}

export async function homeStats(): Promise<HomeStats> {
  const owner = await ownerId();
  const db = getDb();

  const weekAgo = sql`now() - interval '7 days'`;

  const [
    entryCount,
    weekCount,
    tagRows,
    resumeRow,
    jobRows,
    appRows,
    lastLog,
  ] = await Promise.all([
    db.select({ n: count() }).from(workLog).where(eq(workLog.ownerId, owner)),
    db
      .select({ n: count() })
      .from(workLog)
      .where(and(eq(workLog.ownerId, owner), gte(workLog.createdAt, weekAgo))),
    // Distinct tags, unnested in SQL rather than pulled into Node — a long
    // journal is a lot of arrays to drag across the wire to count them.
    db.execute(
      sql`select count(distinct t)::int as n
          from ${workLog}, unnest(${workLog.techTags}) as t
          where ${workLog.ownerId} = ${owner}`,
    ),
    db
      .select({ data: resumeMaster.data })
      .from(resumeMaster)
      .where(eq(resumeMaster.ownerId, owner))
      .limit(1),
    db
      .select({ status: job.status, n: sql<number>`count(*)::int` })
      .from(job)
      .where(eq(job.ownerId, owner))
      .groupBy(job.status),
    db
      .select({ status: application.status, n: sql<number>`count(*)::int` })
      .from(application)
      .where(eq(application.ownerId, owner))
      .groupBy(application.status),
    db
      .select({ occurredOn: workLog.occurredOn })
      .from(workLog)
      .where(eq(workLog.ownerId, owner))
      .orderBy(desc(workLog.occurredOn))
      .limit(1),
  ]);

  const jobsByStatus = Object.fromEntries(
    jobRows.map((r) => [r.status, Number(r.n)]),
  );
  const appsByStatus = Object.fromEntries(
    appRows.map((r) => [r.status, Number(r.n)]),
  );

  const resume = resumeRow[0] ? parseResume(resumeRow[0].data) : null;
  const report = resume ? lintResume(resume) : null;
  const resumeEntries =
    resume?.sections.reduce((n, s) => n + s.items.length, 0) ?? 0;

  const last = lastLog[0]?.occurredOn;
  const daysSinceLog = last
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  const tagCount = (tagRows as unknown as { rows?: { n: number }[] }).rows?.[0]?.n;

  return {
    entries: Number(entryCount[0]?.n ?? 0),
    entriesThisWeek: Number(weekCount[0]?.n ?? 0),
    skills: Number(tagCount ?? 0),
    // Only meaningful once the resume has something on it — a score of 30 on
    // an empty document says nothing about the document.
    resumeScore: resumeEntries ? (report?.score ?? null) : null,
    resumeEntries,
    jobsOpen:
      (jobsByStatus.found ?? 0) +
      (jobsByStatus.tailored ?? 0) +
      (jobsByStatus.applied ?? 0),
    jobsStrong: 0, // filled by the caller, which already has the scored list
    applied: (jobsByStatus.applied ?? 0) + (appsByStatus.applied ?? 0),
    interviewing:
      (jobsByStatus.interview ?? 0) + (appsByStatus.interview ?? 0),
    daysSinceLog,
  };
}

/** How many stored postings currently score as a strong match. */
export async function strongMatchCount(): Promise<number> {
  const owner = await ownerId();
  const db = getDb();

  // Cheap proxy rather than scoring every row again: a posting with a
  // description is scoreable, and the Jobs screen does the real ranking. This
  // exists so the home screen can say "worth a look" without duplicating the
  // scorer or paying for it twice on a page that is not about jobs.
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(job)
    .where(
      and(
        eq(job.ownerId, owner),
        eq(job.status, "found"),
        isNotNull(job.description),
      ),
    );

  return Number(row?.n ?? 0);
}
