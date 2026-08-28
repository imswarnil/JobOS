import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";

import { IngestAuthError, requireIngestOwner } from "@/lib/ingest/auth";
import { ingestRequestSchema } from "@/lib/ingest/schema";
import { getDb } from "@/lib/db";
import { job, jobSource } from "@/lib/db/schema";

/**
 * Where discovered postings land.
 *
 * Called by the n8n runner once per watchlist source, with that source's
 * results. Idempotent by construction: `(owner_id, source, external_id)` is a
 * unique index, so re-running the whole watchlist every six hours re-imports
 * nothing and quietly refreshes anything whose title or description changed.
 *
 * Two things are deliberately *not* overwritten on conflict:
 *
 *   `status`     - a posting you have already applied to must not be reset to
 *                  "found" because the crawler saw it again. This is the
 *                  single most damaging thing a naive upsert could do here.
 *   `matchScore` - scoring is a separate, more expensive pass; re-importing
 *                  should not silently discard its result.
 *
 * The owner comes from the token's environment binding, never from the body,
 * so there is no field a caller could set to write into another account.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let owner: string;
  try {
    owner = requireIngestOwner(request);
  } catch (error) {
    if (error instanceof IngestAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const parsed = ingestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: parsed.error.issues.slice(0, 10) },
      { status: 422 },
    );
  }

  const { sourceId, error: sourceError, jobs } = parsed.data;
  const db = getDb();

  /**
   * Record the run against the watchlist entry first, so a source that fails
   * every time still shows a fresh `last_run_at` and a reason. Scoped by
   * owner as well as id, because the id came from the request.
   */
  if (sourceId) {
    await db
      .update(jobSource)
      .set({
        lastRunAt: new Date(),
        lastError: sourceError ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(jobSource.id, sourceId), eq(jobSource.ownerId, owner)));
  }

  if (!jobs.length) {
    return NextResponse.json({ received: 0, inserted: 0, updated: 0 });
  }

  /**
   * De-duplicate within the batch before it reaches Postgres.
   *
   * `ON CONFLICT DO UPDATE` cannot touch the same row twice in one statement
   * - it raises "cannot affect row a second time" and the whole batch fails.
   * A single career page listing the same role under two departments is
   * enough to trigger it, so this is a real case, not a theoretical one.
   *
   * First occurrence wins, matching `dedupe()` in lib/jobs: a listing page
   * yields a title and a link, while the detail page yields the description
   * too, and the runner sends the richer one first. Last-wins would let the
   * thinner copy of a row overwrite the fuller one it was queued behind.
   */
  const byKey = new Map<string, (typeof jobs)[number]>();
  for (const j of jobs) {
    const key = `${j.source} ${j.externalId}`;
    if (!byKey.has(key)) byKey.set(key, j);
  }
  const unique = [...byKey.values()];

  // Which of these already exist, so the response can distinguish new from
  // refreshed. Done as one read rather than inferred from Postgres internals.
  const existing = await db
    .select({ source: job.source, externalId: job.externalId })
    .from(job)
    .where(
      and(
        eq(job.ownerId, owner),
        inArray(
          job.externalId,
          unique.map((j) => j.externalId),
        ),
      ),
    );
  const known = new Set(existing.map((r) => `${r.source} ${r.externalId}`));

  await db
    .insert(job)
    .values(
      unique.map((j) => ({
        ownerId: owner,
        source: j.source,
        externalId: j.externalId,
        title: j.title,
        company: j.company ?? null,
        url: j.url ?? null,
        description: j.description ?? null,
        location: j.location ?? null,
        remote: j.remote ?? null,
        salaryMin: j.salaryMin ?? null,
        salaryMax: j.salaryMax ?? null,
        postedAt: j.postedAt ? new Date(j.postedAt) : null,
      })),
    )
    .onConflictDoUpdate({
      target: [job.ownerId, job.source, job.externalId],
      set: {
        title: sql`excluded.title`,
        company: sql`excluded.company`,
        url: sql`excluded.url`,
        /**
         * Keep the better text. A run that could not reach the detail page
         * sends a title and nothing else, and letting that null overwrite a
         * description already stored would make the record worse every time
         * the network hiccuped.
         */
        description: sql`coalesce(nullif(excluded.description, ''), ${job.description})`,
        location: sql`coalesce(excluded.location, ${job.location})`,
        remote: sql`coalesce(excluded.remote, ${job.remote})`,
        salaryMin: sql`coalesce(excluded.salary_min, ${job.salaryMin})`,
        salaryMax: sql`coalesce(excluded.salary_max, ${job.salaryMax})`,
        postedAt: sql`coalesce(excluded.posted_at, ${job.postedAt})`,
        updatedAt: new Date(),
        // status and match_score are intentionally absent - see the header.
      },
    });

  const inserted = unique.filter(
    (j) => !known.has(`${j.source} ${j.externalId}`),
  ).length;

  return NextResponse.json({
    received: jobs.length,
    deduped: jobs.length - unique.length,
    inserted,
    updated: unique.length - inserted,
  });
}
