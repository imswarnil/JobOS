import "server-only";

/**
 * TITLE SEARCH, VIA GOOGLE'S DOCUMENTED SEARCH API
 * ================================================
 *
 * The other connectors answer "what is this company hiring for". This one
 * answers the question people actually start with: *who is hiring a Salesforce
 * Developer this week?* Greenhouse and Lever cannot answer it — a board token
 * is the query, so without knowing the company first there is nothing to ask.
 *
 * **This is the Programmable Search JSON API, not a scraper.** The difference
 * is not pedantry:
 *
 *   - Automating google.com/search is against Google's terms, and the block
 *     that follows lands on an IP, not an account. On this deployment that IP
 *     also serves Crawl4AI, Ollama, Ghost and n8n — one crawler takes the
 *     whole box off the internet.
 *   - `src/lib/jobs/index.ts` states that discovery goes through documented
 *     interfaces. A SERP scraper would make that sentence false, and the
 *     sentence is the reason this project can be described honestly.
 *
 * The API is documented, permitted, and free for 100 queries a day — which is
 * more than a three-hourly schedule over a handful of titles needs.
 *
 * The search engine must be configured to *include* ATS domains rather than
 * search the whole web, or the results are think-pieces about the job market
 * instead of the job. See `docs/JOB-SEARCH.md`.
 */

export interface GoogleJobHit {
  /** The posting URL. Deduplicated on this. */
  url: string;
  title: string;
  /** Google's snippet — enough to score against until the page is fetched. */
  snippet: string;
  /** Derived from the URL, since the API does not return an employer. */
  source: string;
  externalId: string;
}

export class GoogleSearchError extends Error {}

const ENDPOINT = "https://www.googleapis.com/customsearch/v1";
const TIMEOUT_MS = 15_000;

/** Google returns at most 10 per request and bills each request the same. */
const PAGE_SIZE = 10;

export function isConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SEARCH_KEY && process.env.GOOGLE_SEARCH_CX);
}

/**
 * Which ATS a result URL belongs to, so the row is attributed honestly.
 *
 * `source` is also half of the dedup key, so a posting found by search and
 * again by the watchlist must resolve to the *same* source name — otherwise
 * the unique index sees two different rows and you get it twice.
 */
function classify(url: URL): { source: string; externalId: string } | null {
  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  if (host.endsWith("greenhouse.io")) {
    const id = path.match(/\/jobs\/(\d+)/)?.[1];
    return id ? { source: "greenhouse", externalId: id } : null;
  }
  if (host.endsWith("lever.co")) {
    const id = path.split("/").filter(Boolean).pop();
    return id ? { source: "lever", externalId: id } : null;
  }
  if (host.endsWith("ashbyhq.com")) {
    const id = path.split("/").filter(Boolean).pop();
    return id ? { source: "ashby", externalId: id } : null;
  }
  if (host.includes("myworkdayjobs.com")) {
    const id = path.split("/").filter(Boolean).pop();
    return id ? { source: "workday", externalId: id } : null;
  }
  // Anything else the engine was configured to include. Hash the URL, since
  // there is no provider id to borrow — see the note in DISCOVERY-PIPELINE.md
  // about why a null externalId re-imports forever.
  return { source: "search", externalId: hashUrl(url.toString()) };
}

/** A stable short id for a URL. Not security — just a dedup key. */
function hashUrl(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/**
 * One page of results for one title.
 *
 * `dateRestrict` is what makes a three-hourly schedule sane: without it every
 * run returns the same evergreen postings and the only thing that changes is
 * the quota. `d1` asks Google for pages it has indexed in the last day.
 */
export async function searchTitle(
  title: string,
  options: { location?: string; freshDays?: number; start?: number } = {},
): Promise<GoogleJobHit[]> {
  const key = process.env.GOOGLE_SEARCH_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (!key || !cx) {
    throw new GoogleSearchError(
      "GOOGLE_SEARCH_KEY and GOOGLE_SEARCH_CX are not set.",
    );
  }

  const query = [title, options.location].filter(Boolean).join(" ");

  const url = new URL(ENDPOINT);
  url.searchParams.set("key", key);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(PAGE_SIZE));
  url.searchParams.set("dateRestrict", `d${options.freshDays ?? 1}`);
  if (options.start) url.searchParams.set("start", String(options.start));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });

    if (res.status === 429) {
      throw new GoogleSearchError(
        "Google's daily search quota is used up. It resets at midnight Pacific.",
      );
    }
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200);
      throw new GoogleSearchError(`Google search returned ${res.status}: ${detail}`);
    }

    const data = (await res.json()) as {
      items?: { link?: string; title?: string; snippet?: string }[];
    };

    const hits: GoogleJobHit[] = [];

    for (const item of data.items ?? []) {
      if (!item.link) continue;
      let parsed: URL;
      try {
        parsed = new URL(item.link);
      } catch {
        continue;
      }

      const kind = classify(parsed);
      if (!kind) continue;

      hits.push({
        url: item.link,
        // Google appends the site name to <title>; the posting's own title is
        // the part before the first separator.
        title: (item.title ?? "").split(/\s+[|\-–—]\s+/)[0].trim(),
        snippet: item.snippet ?? "",
        ...kind,
      });
    }

    return hits;
  } catch (error) {
    if (error instanceof GoogleSearchError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new GoogleSearchError("Google search timed out.");
    }
    throw new GoogleSearchError(`Google search failed: ${(error as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}
