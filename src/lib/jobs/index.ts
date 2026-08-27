/**
 * JOB DISCOVERY SEAM — Phase 4
 * ============================
 *
 * Discovery goes through documented public APIs and published job feeds only.
 * No scraping, no logging into anyone's account, no circumventing a robots.txt
 * or a rate limit. Every connector below is a client for an interface its
 * provider publishes on purpose.
 *
 * Each source normalises into the same `DiscoveredJob` shape, so ranking,
 * de-duplication and storage never learn where a posting came from.
 */

export interface JobSearchQuery {
  keywords: string[];
  location?: string;
  remote?: boolean;
  minSalary?: number;
  seniority?: string;
  /** Ignore anything older than this. */
  postedAfter?: Date;
  limit?: number;
  /**
   * Company board tokens, for the per-company sources.
   *
   * Greenhouse and Lever have no global search — a board token *is* the
   * query, and without one there is nothing to ask. An aggregator like
   * Adzuna ignores this and reads `keywords` instead, which is why the two
   * kinds of source share one interface but not one input.
   */
  boards?: string[];
}

/** A posting as it arrives, before it is scored or saved. */
export interface DiscoveredJob {
  source: string;
  /** The provider's stable id — used to avoid importing the same role twice. */
  externalId: string;
  title: string;
  company?: string;
  location?: string;
  remote?: boolean;
  url: string;
  description?: string;
  postedAt?: Date;
  salaryMin?: number;
  salaryMax?: number;
}

export interface JobSource {
  readonly name: string;
  /** True when the environment has whatever credentials this source needs. */
  isConfigured(): boolean;
  search(query: JobSearchQuery): Promise<DiscoveredJob[]>;
}

export { greenhouseSource } from "@/lib/jobs/sources/greenhouse";
export { leverSource } from "@/lib/jobs/sources/lever";
export { adzunaSource } from "@/lib/jobs/sources/adzuna";

import { greenhouseSource } from "@/lib/jobs/sources/greenhouse";
import { leverSource } from "@/lib/jobs/sources/lever";
import { adzunaSource } from "@/lib/jobs/sources/adzuna";

export const ALL_SOURCES: JobSource[] = [
  greenhouseSource,
  leverSource,
  adzunaSource,
];

/** Only the sources that can actually run right now. */
export function configuredSources(): JobSource[] {
  return ALL_SOURCES.filter((source) => source.isConfigured());
}

/**
 * Every configured source, run at once and merged.
 *
 * Settled rather than awaited together: a board that 404s or times out must
 * cost its own results and nothing else. A run that returns nine sources'
 * worth of postings is worth far more than one that returns an error because
 * the tenth was unreachable.
 *
 * TODO(Phase 4): score each survivor against the owner's journal.
 */
export async function discover(
  query: JobSearchQuery,
): Promise<DiscoveredJob[]> {
  const sources = configuredSources();
  if (!sources.length) return [];

  const runs = await Promise.allSettled(
    sources.map((source) => source.search(query)),
  );

  return dedupe(
    runs.flatMap((r) => (r.status === "fulfilled" ? r.value : [])),
  );
}

/**
 * Two passes, because there are two ways to see the same job twice.
 *
 * Within a source, `(source, externalId)` is exact — the same posting
 * fetched twice, which the unique index on `job` also enforces. Across
 * sources it is a judgement call: the same role listed on a company's
 * Greenhouse board and syndicated to an aggregator has different ids and
 * different URLs, so the only handle is the title and the company. That
 * comparison is normalised and deliberately blunt; a false merge loses one
 * duplicate listing, while no merge at all means reviewing the same job
 * repeatedly, and the first costs less.
 *
 * Earlier wins, so a posting from the company's own board — which carries
 * the better description — survives over its syndicated copy.
 */
function dedupe(jobs: DiscoveredJob[]): DiscoveredJob[] {
  const byExternal = new Set<string>();
  const byIdentity = new Set<string>();
  const kept: DiscoveredJob[] = [];

  for (const job of jobs) {
    const external = `${job.source}\u0000${job.externalId}`;
    if (byExternal.has(external)) continue;

    const identity = `${normalise(job.title)}\u0000${normalise(job.company ?? "")}`;
    if (byIdentity.has(identity)) continue;

    byExternal.add(external);
    byIdentity.add(identity);
    kept.push(job);
  }

  return kept;
}

/** Case, punctuation and spacing all vary between feeds; none of it matters. */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
