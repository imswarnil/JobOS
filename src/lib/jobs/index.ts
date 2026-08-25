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
 * TODO(Phase 4): fan out across configured sources, de-duplicate on
 * (source, externalId) and then again on (title, company) across sources,
 * and score each survivor against the owner's journal.
 */
export async function discover(): Promise<DiscoveredJob[]> {
  throw new Error("Not implemented until Phase 4.");
}
