import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { job, jobCriteria } from "@/lib/db/schema";
import { searchTitle, isConfigured, GoogleSearchError } from "@/lib/jobs/sources/google";
import { fetchPosting, FetchPostingError } from "@/lib/tailor/fetch-posting";

/**
 * RUNNING THE SAVED SEARCHES
 * ==========================
 *
 * A saved search is a `job_criteria` row. That table already holds exactly
 * what a watched search is — a title, keywords, a location, a remote flag —
 * and reusing it means no migration and no new concept for the user to learn.
 *
 * The shape of a run is three steps, and the ordering matters:
 *
 *   1. Ask Google for postings matching the title, indexed recently.
 *   2. Drop anything already stored, *before* fetching anything.
 *   3. Fetch the page for whatever is left, and store it.
 *
 * Step 2 before step 3 is the whole efficiency of this. A three-hourly
 * schedule mostly rediscovers what it found last time; fetching those pages
 * again would be minutes of Crawl4AI work per run for zero new rows, on a
 * two-core box that is also running the model.
 *
 * The description matters more than it looks. Scoring refuses to judge a
 * posting without one — a title-only row would get a confident number derived
 * from eight words — so a run that imports rows without descriptions has
 * produced nothing usable.
 */

/**
 * How many new postings to fetch pages for in one run.
 *
 * Crawl4AI takes 3-15s per page and shares two cores with Ollama. Twelve is
 * roughly a minute of work, which fits comfortably inside a three-hour gap
 * and leaves the box responsive. Anything beyond the cap is simply left for
 * the next run — the search is scheduled, not a deadline.
 */
const FETCH_BUDGET = 12;

export interface SearchRunResult {
  searches: number;
  /** Results Google returned, before deduplication. */
  found: number;
  /** Already in the database. */
  known: number;
  /** Newly stored, with a description. */
  imported: number;
  /** New, but the page could not be read — stored without a description. */
  unread: number;
  /** Left for the next run because the fetch budget ran out. */
  deferred: number;
  errors: string[];
}

/**
 * Runs every saved search for one owner.
 *
 * Takes the owner explicitly rather than reading a session, because the
 * caller is either a scheduled machine request or a server action, and only
 * one of those has a session.
 */
export async function runSavedSearches(
  owner: string,
): Promise<SearchRunResult> {
  const result: SearchRunResult = {
    searches: 0,
    found: 0,
    known: 0,
    imported: 0,
    unread: 0,
    deferred: 0,
    errors: [],
  };

  if (!isConfigured()) {
    result.errors.push(
      "Google search is not configured. Set GOOGLE_SEARCH_KEY and GOOGLE_SEARCH_CX.",
    );
    return result;
  }

  const db = getDb();

  const searches = await db
    .select({
      title: jobCriteria.title,
      location: jobCriteria.location,
      remote: jobCriteria.remote,
    })
    .from(jobCriteria)
    .where(eq(jobCriteria.ownerId, owner));

  if (!searches.length) {
    result.errors.push(
      "No saved searches. Add a job title on the Jobs screen and this will have something to look for.",
    );
    return result;
  }

  result.searches = searches.length;

  // Collect across all searches first, so deduplication sees the whole run —
  // two titles routinely return the same posting.
  const hits = new Map<string, Awaited<ReturnType<typeof searchTitle>>[number]>();

  for (const search of searches) {
    try {
      const found = await searchTitle(search.title, {
        // A remote-only search should not be narrowed by a city.
        location: search.remote ? undefined : (search.location ?? undefined),
      });
      result.found += found.length;
      for (const hit of found) {
        hits.set(`${hit.source}:${hit.externalId}`, hit);
      }
    } catch (error) {
      result.errors.push(
        error instanceof GoogleSearchError
          ? `"${search.title}": ${error.message}`
          : `"${search.title}": ${(error as Error).message}`,
      );
    }
  }

  if (!hits.size) return result;

  /* ── Drop what is already stored, before fetching anything ─────────────── */

  const ids = [...hits.values()].map((h) => h.externalId);
  const existing = await db
    .select({ source: job.source, externalId: job.externalId })
    .from(job)
    .where(and(eq(job.ownerId, owner), inArray(job.externalId, ids)));

  const known = new Set(
    existing.map((e) => `${e.source}:${e.externalId}`),
  );

  const fresh = [...hits.entries()]
    .filter(([key]) => !known.has(key))
    .map(([, hit]) => hit);

  result.known = hits.size - fresh.length;

  /* ── Fetch and store ───────────────────────────────────────────────────── */

  const batch = fresh.slice(0, FETCH_BUDGET);
  result.deferred = fresh.length - batch.length;

  for (const hit of batch) {
    let description: string | null = null;

    try {
      description = await fetchPosting(hit.url);
    } catch (error) {
      // Stored anyway, without a description. The row is real and the URL
      // works — scoring will mark it unscoreable and the Jobs screen says so,
      // which is more useful than silently dropping a posting that exists.
      result.errors.push(
        `${hit.title || hit.url}: ${
          error instanceof FetchPostingError
            ? error.message
            : (error as Error).message
        }`,
      );
    }

    await db
      .insert(job)
      .values({
        ownerId: owner,
        source: hit.source,
        externalId: hit.externalId,
        title: hit.title || "Untitled posting",
        url: hit.url,
        // The snippet is a poor description but it is better than null when
        // the fetch failed — enough for a title match, not enough to score.
        description: description ?? null,
        company: null,
      })
      // Never clobber a row the watchlist runner already owns, and never
      // reset a status. See docs/DISCOVERY-PIPELINE.md.
      .onConflictDoNothing();

    if (description) result.imported += 1;
    else result.unread += 1;
  }

  return result;
}
