import { z } from "zod";

/**
 * The wire format between the discovery runner and JobOS.
 *
 * This mirrors `DiscoveredJob` in `src/lib/jobs/index.ts` — that interface is
 * the in-process shape, this is the same thing after a network hop, and they
 * are meant to stay in step. Validating here rather than trusting the runner
 * is not paranoia about n8n: the payload for a `careerpage` source has been
 * through a language model, and a model's output is untrusted input.
 */

/** Generous, because job descriptions are long, but not unbounded. */
const MAX_DESCRIPTION = 40_000;

/** One request should be one source's worth of results, not a whole run. */
export const MAX_JOBS_PER_REQUEST = 200;

export const discoveredJobSchema = z.object({
  source: z.string().min(1).max(40),
  /**
   * Required, unlike the database column, which is nullable for manually
   * added rows. Postgres treats NULLs as distinct, so a null here would slip
   * straight past the `(owner, source, external_id)` unique index and import
   * the same posting on every run. A crawled page has no provider id, so the
   * runner derives a stable one from the URL — see the pipeline doc.
   */
  externalId: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  company: z.string().max(200).nullish(),
  location: z.string().max(200).nullish(),
  remote: z.boolean().nullish(),
  url: z.url().max(2000).nullish(),
  description: z.string().max(MAX_DESCRIPTION).nullish(),
  /** ISO 8601. Anything unparseable is dropped rather than defaulted to now. */
  postedAt: z.iso.datetime({ offset: true }).nullish(),
  salaryMin: z.number().int().nonnegative().max(100_000_000).nullish(),
  salaryMax: z.number().int().nonnegative().max(100_000_000).nullish(),
});

export type DiscoveredJobPayload = z.infer<typeof discoveredJobSchema>;

export const ingestRequestSchema = z.object({
  /**
   * Which watchlist entry produced this batch. Optional so an ad-hoc push
   * still works, but supplying it is what keeps `last_run_at` and
   * `last_error` honest — a board that has silently 404'd for a month should
   * be visible in the UI, not merely absent from the results.
   */
  sourceId: z.uuid().nullish(),
  /** Set when the source failed. Recorded against the source, not swallowed. */
  error: z.string().max(500).nullish(),
  jobs: z.array(discoveredJobSchema).max(MAX_JOBS_PER_REQUEST).default([]),
});

export type IngestRequest = z.infer<typeof ingestRequestSchema>;
