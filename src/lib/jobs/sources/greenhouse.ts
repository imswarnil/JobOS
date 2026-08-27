import type { DiscoveredJob, JobSearchQuery, JobSource } from "@/lib/jobs";
import {
  SourceError,
  fetchJson,
  looksRemote,
  matchesKeywords,
  stripHtml,
} from "@/lib/jobs/sources/http";

/**
 * Greenhouse job boards expose a public, unauthenticated JSON endpoint per
 * company: `https://boards-api.greenhouse.io/v1/boards/{token}/jobs`.
 *
 * There is no global search — you follow a list of board tokens. So this
 * connector is configured by a watchlist rather than by a credential, and
 * `isConfigured` is always true: there is nothing to hold it back except
 * being given nowhere to look.
 *
 * `?content=true` returns the full posting, which costs a much larger
 * response and is the only reason to prefer this over the bare list — the
 * description is what Phase 3 grounds a tailored rewrite against, so it is
 * worth the bytes.
 */

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  first_published?: string;
  company_name?: string;
  location?: { name?: string };
  content?: string;
}

export const greenhouseSource: JobSource = {
  name: "greenhouse",

  isConfigured() {
    return true;
  },

  async search(query: JobSearchQuery): Promise<DiscoveredJob[]> {
    const boards = query.boards ?? [];
    if (!boards.length) return [];

    // One board failing must not lose the others, so each is settled apart.
    const runs = await Promise.allSettled(
      boards.map((board) => fetchBoard(board, query)),
    );

    const found = runs.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    return query.limit ? found.slice(0, query.limit) : found;
  },
};

async function fetchBoard(
  board: string,
  query: JobSearchQuery,
): Promise<DiscoveredJob[]> {
  const token = board.trim().toLowerCase();
  if (!token) throw new SourceError("greenhouse", board, "Empty board token");

  const data = await fetchJson<{ jobs?: GreenhouseJob[] }>(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`,
    "greenhouse",
    token,
  );

  return (data.jobs ?? []).flatMap((job) => {
    const location = job.location?.name;
    const description = job.content ? stripHtml(job.content) : undefined;

    // Title and location are always searched; the body only when it is there.
    if (!matchesKeywords(
      [job.title, location, description].filter(Boolean).join(" "),
      query.keywords,
    )) {
      return [];
    }

    const postedAt = parseDate(job.first_published ?? job.updated_at);
    if (query.postedAfter && postedAt && postedAt < query.postedAfter) return [];

    const remote = looksRemote(location, job.title);
    if (query.remote && !remote) return [];

    return [
      {
        source: "greenhouse",
        externalId: String(job.id),
        title: job.title,
        company: job.company_name ?? token,
        location,
        remote,
        url: job.absolute_url,
        description,
        postedAt,
      } satisfies DiscoveredJob,
    ];
  });
}

/** `undefined` rather than an Invalid Date, which would poison every compare. */
function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? undefined : at;
}
