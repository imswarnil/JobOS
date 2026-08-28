import "server-only";

import { and, desc, eq, isNull, notInArray, or, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { job, jobCriteria, workLog } from "@/lib/db/schema";
import type { ApplicationStatus } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { ownerId } from "@/lib/auth/scope";
import { readResume } from "@/lib/resume/queries";
import { scoreJob, type ScoreBreakdown, type ScoringEvidence } from "@/lib/jobs/scoring";

/**
 * READING THE PIPELINE
 * ====================
 *
 * Discovery writes rows through `/api/ingest/jobs`; everything here reads
 * them. That seam is deliberate and worth keeping clean — the runner owns
 * getting postings in, this file owns making sense of them.
 *
 * Scoring happens on read rather than on write, and the reason is that the
 * score is a function of *you*, not of the posting. Log a fortnight of
 * Postgres work and every stored Postgres job should be worth more this
 * morning than it was last night, without anything re-running. A score
 * written into the row at import time would be a snapshot of who you were
 * when the crawler happened to fire.
 *
 * It is affordable because `scoreJob` is pure and takes microseconds: the
 * evidence set is loaded once and reused across every row.
 */

/** How much journal history feeds the scorer. */
const EVIDENCE_LIMIT = 400;

/** Loads everything the scorer needs, once per request. */
export async function loadScoringEvidence(
  owner: string,
): Promise<ScoringEvidence> {
  const db = getDb();

  const [entries, resume, criteria] = await Promise.all([
    db
      .select({
        occurredOn: workLog.occurredOn,
        title: workLog.title,
        body: workLog.body,
        impact: workLog.impact,
        techTags: workLog.techTags,
        tags: workLog.tags,
      })
      .from(workLog)
      .where(eq(workLog.ownerId, owner))
      .orderBy(desc(workLog.occurredOn))
      .limit(EVIDENCE_LIMIT),
    readResume(),
    db
      .select({
        title: jobCriteria.title,
        keywords: jobCriteria.keywords,
        location: jobCriteria.location,
        remote: jobCriteria.remote,
        seniority: jobCriteria.seniority,
      })
      .from(jobCriteria)
      .where(eq(jobCriteria.ownerId, owner))
      .limit(1),
  ]);

  return { entries, resume, criteria: criteria[0] ?? null };
}

export interface ScoredJob {
  id: string;
  source: string;
  title: string;
  company: string | null;
  url: string | null;
  description: string | null;
  location: string | null;
  remote: boolean | null;
  postedAt: Date | null;
  createdAt: Date;
  status: ApplicationStatus;
  breakdown: ScoreBreakdown;
}

export interface JobFilters {
  /** Hide anything below this score. */
  minScore?: number;
  /** Only this status. Omitted means everything still open. */
  status?: ApplicationStatus;
  /** Free-text over title and company. */
  q?: string;
}

/**
 * Statuses that mean "this one is closed".
 *
 * The default view excludes them, because a posting you rejected reappearing
 * at the top of the list every morning is how a tool teaches you to stop
 * opening it. Named as the *exclusion* rather than listing the open states,
 * so adding a stage to the enum keeps it visible by default — the safer
 * direction to be wrong in.
 */
const CLOSED: ApplicationStatus[] = ["rejected", "skipped"];

/**
 * Every stored posting, scored and ranked.
 *
 * Ordered by score rather than by date on purpose: a chronological job list
 * is the thing every board already gives you, and it is the reason people
 * stop opening them. The whole point of holding a journal is to be able to
 * put the right one first.
 */
export async function listScoredJobs(
  filters: JobFilters = {},
): Promise<{ jobs: ScoredJob[]; total: number; unscored: number }> {
  const user = await requireUser();
  const db = getDb();

  const conditions = [eq(job.ownerId, user.id)];

  if (filters.status) {
    conditions.push(eq(job.status, filters.status));
  } else {
    conditions.push(notInArray(job.status, CLOSED));
  }

  if (filters.q) {
    const needle = `%${filters.q.toLowerCase()}%`;
    conditions.push(
      or(
        sql`lower(${job.title}) like ${needle}`,
        sql`lower(coalesce(${job.company}, '')) like ${needle}`,
      )!,
    );
  }

  const rows = await db
    .select({
      id: job.id,
      source: job.source,
      title: job.title,
      company: job.company,
      url: job.url,
      description: job.description,
      location: job.location,
      remote: job.remote,
      postedAt: job.postedAt,
      createdAt: job.createdAt,
      status: job.status,
    })
    .from(job)
    .where(and(...conditions))
    .orderBy(desc(job.postedAt), desc(job.createdAt))
    .limit(300);

  const evidence = await loadScoringEvidence(user.id);
  const now = new Date();

  const scored: ScoredJob[] = rows.map((row) => ({
    ...row,
    breakdown: scoreJob(row, evidence, now),
  }));

  const unscored = scored.filter((s) => s.breakdown.unscoreable).length;

  const min = filters.minScore ?? 0;
  const visible = scored
    .filter((s) => s.breakdown.score >= min || s.breakdown.unscoreable)
    .sort((a, b) => {
      // Unscoreable rows sink rather than disappear: they are real postings
      // whose description failed to import, and hiding them would hide the
      // import bug too.
      if (a.breakdown.unscoreable !== b.breakdown.unscoreable) {
        return a.breakdown.unscoreable ? 1 : -1;
      }
      return b.breakdown.score - a.breakdown.score;
    });

  return { jobs: visible, total: rows.length, unscored };
}

/** Counts per status, for the filter chips. */
export async function jobCounts(): Promise<Record<string, number>> {
  const owner = await ownerId();
  const db = getDb();

  const rows = await db
    .select({ status: job.status, n: sql<number>`count(*)::int` })
    .from(job)
    .where(eq(job.ownerId, owner))
    .groupBy(job.status);

  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
}

/** True when discovery has never delivered anything — drives the empty state. */
export async function hasAnyJobs(): Promise<boolean> {
  const owner = await ownerId();
  const db = getDb();
  const [row] = await db
    .select({ id: job.id })
    .from(job)
    .where(eq(job.ownerId, owner))
    .limit(1);
  return Boolean(row);
}

/** Postings imported without a description, which scoring cannot judge. */
export async function countMissingDescriptions(): Promise<number> {
  const owner = await ownerId();
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(job)
    .where(and(eq(job.ownerId, owner), isNull(job.description)));
  return Number(row?.n ?? 0);
}

/** The titles being watched. A saved search is a `job_criteria` row. */
export async function listSavedSearches() {
  const owner = await ownerId();
  const db = getDb();

  return db
    .select({
      id: jobCriteria.id,
      title: jobCriteria.title,
      location: jobCriteria.location,
      remote: jobCriteria.remote,
    })
    .from(jobCriteria)
    .where(eq(jobCriteria.ownerId, owner))
    .orderBy(jobCriteria.createdAt);
}
