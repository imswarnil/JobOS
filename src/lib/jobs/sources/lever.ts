import type { DiscoveredJob, JobSearchQuery, JobSource } from "@/lib/jobs";
import {
  SourceError,
  fetchJson,
  looksRemote,
  matchesKeywords,
} from "@/lib/jobs/sources/http";

/**
 * Lever publishes the same way as Greenhouse: one public JSON feed per
 * company at `https://api.lever.co/v0/postings/{company}?mode=json`.
 * Also per-company, also no credentials, also driven by a watchlist.
 *
 * Two differences from Greenhouse worth knowing. The response is a bare
 * array rather than an envelope, so there is no `meta` to check. And the
 * description arrives as `descriptionPlain` — already text, so unlike
 * Greenhouse nothing has to be decoded or stripped.
 */

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  /** Epoch milliseconds, not an ISO string. */
  createdAt?: number;
  workplaceType?: string;
  descriptionPlain?: string;
  categories?: {
    location?: string;
    team?: string;
    department?: string;
    commitment?: string;
  };
}

export const leverSource: JobSource = {
  name: "lever",

  isConfigured() {
    return true;
  },

  async search(query: JobSearchQuery): Promise<DiscoveredJob[]> {
    const boards = query.boards ?? [];
    if (!boards.length) return [];

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
  if (!token) throw new SourceError("lever", board, "Empty board token");

  const postings = await fetchJson<LeverPosting[]>(
    `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`,
    "lever",
    token,
  );

  // A wrong token can 200 with an empty array rather than 404, so an empty
  // board is indistinguishable from a typo. Reported as neither.
  if (!Array.isArray(postings)) return [];

  return postings.flatMap((post) => {
    const location = post.categories?.location;
    const description = post.descriptionPlain;

    if (!matchesKeywords(
      [post.text, location, post.categories?.team, description]
        .filter(Boolean)
        .join(" "),
      query.keywords,
    )) {
      return [];
    }

    const postedAt = post.createdAt ? new Date(post.createdAt) : undefined;
    if (query.postedAfter && postedAt && postedAt < query.postedAfter) return [];

    // `workplaceType` is the only structured remote signal either board
    // publishes; the location string is the fallback when it is absent.
    const remote =
      post.workplaceType?.toLowerCase() === "remote" ||
      looksRemote(location, post.text);
    if (query.remote && !remote) return [];

    return [
      {
        source: "lever",
        externalId: post.id,
        title: post.text,
        company: token,
        location,
        remote,
        url: post.hostedUrl || post.applyUrl || "",
        description,
        postedAt,
      } satisfies DiscoveredJob,
    ];
  });
}
