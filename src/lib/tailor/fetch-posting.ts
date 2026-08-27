import "server-only";

/**
 * FETCHING A POSTING FROM A URL
 * =============================
 *
 * The ethical line, stated plainly because it is easy to drift across:
 *
 *   Allowed — a person pastes the URL of one job they are about to apply to,
 *   and we fetch that page on their behalf. That is a browser request with
 *   extra steps.
 *
 *   Not allowed — crawling a board, following pagination, harvesting listings
 *   in bulk. JobOS says in its own docs that discovery uses documented public
 *   APIs and not scraping, and a "fetch any URL" helper is exactly how that
 *   promise quietly stops being true.
 *
 * So this fetches exactly one page, once, on an explicit user action. There is
 * no queue, no recursion and no link-following, and there should never be.
 *
 * `CRAWL4AI_BASE_URL` puts a Crawl4AI instance in front for pages that need a
 * real browser — many job boards render the description client-side, and
 * plain HTML then yields an empty shell. It is an upgrade to this path, not a
 * dependency of it: if it fails, the plain fetch still runs. Same single-page
 * limit either way, and that limit is the point — Crawl4AI makes crossing the
 * line into "crawl the board" trivial, which is exactly why it does not.
 */

const TIMEOUT_MS = 20_000;
const MAX_BYTES = 2_000_000;

export class FetchPostingError extends Error {}

function assertPublicHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchPostingError("That does not look like a URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new FetchPostingError("Only http and https links can be fetched.");
  }

  /**
   * Refuse anything that could reach our own infrastructure.
   *
   * Without this, "fetch a URL for me" is a server-side request forgery hole:
   * a link to 169.254.169.254 or to an internal hostname would have JobOS
   * read its own cloud metadata and hand it back as a "job description".
   */
  const host = url.hostname.toLowerCase();
  const isPrivate =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "[::1]";

  if (isPrivate) {
    throw new FetchPostingError("That address is not reachable from here.");
  }

  return url;
}

/** Strips a page down to the text a model should read. */
function extractText(html: string): string {
  return html
    // Whole elements whose contents are never prose.
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Keep block boundaries as newlines so lists survive as lists.
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/**
 * CRAWL4AI
 * ========
 *
 * Most job boards render the description in the browser. A plain fetch of a
 * Greenhouse or Workday link gets an empty React shell, the extractor returns
 * forty words of nav, and the model is then asked to parse a posting it has
 * never seen. Crawl4AI runs a real browser and returns the text that a person
 * would actually read.
 *
 * Two things matter about how it is called here.
 *
 * **`fit_markdown`, not `raw_markdown`.** Crawl4AI can run a pruning filter
 * over the rendered page and return only the content-bearing part. On a job
 * posting that is the difference between the description and the description
 * wrapped in a cookie banner, a nav bar, "similar jobs", and a footer with
 * every office location in it. All of that boilerplate ends up in the prompt
 * otherwise, and a 3B model asked to find the requirements in it will happily
 * report the footer's city list as the location.
 *
 * **It falls back rather than failing.** The old version threw when Crawl4AI
 * errored, which meant a VPS that was asleep turned "paste a job link" into a
 * dead feature — even for the many postings plain HTML handles perfectly
 * well. Crawl4AI is an upgrade to this path, not a dependency of it.
 */

interface Crawl4aiResult {
  url?: string;
  success?: boolean;
  error_message?: string;
  /** A string on older builds, an object with the filtered variants on newer. */
  markdown?:
    | string
    | { raw_markdown?: string; fit_markdown?: string };
  cleaned_html?: string;
}

/**
 * The pruning filter's threshold.
 *
 * 0.45 is deliberately gentler than Crawl4AI's 0.48 default. Job postings are
 * mostly short bullet fragments, which score low on the density heuristic, and
 * an aggressive threshold starts eating the requirements list — the one part
 * that must survive. Erring toward keeping boilerplate is the right direction
 * here: the model can ignore a nav bar, it cannot recover a dropped bullet.
 */
const PRUNE_THRESHOLD = 0.45;

async function viaCrawl4ai(url: string, base: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (process.env.CRAWL4AI_API_KEY) {
      headers.authorization = `Bearer ${process.env.CRAWL4AI_API_KEY}`;
    }

    const res = await fetch(`${base.replace(/\/$/, "")}/crawl`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        urls: [url],
        crawler_config: {
          // Never serve a stale copy: a posting that closed yesterday should
          // read as closed, and these are one-off user-initiated fetches
          // where there is nothing to gain from a cache.
          cache_mode: "bypass",
          // Some boards paint the description after the first paint. Without
          // a wait the browser returns the same empty shell plain fetch got,
          // which is the entire failure this service exists to fix.
          wait_until: "networkidle",
          page_timeout: 20_000,
          excluded_tags: ["nav", "header", "footer", "aside", "form"],
          exclude_external_links: true,
          remove_overlay_elements: true,
          markdown_generator: {
            type: "DefaultMarkdownGenerator",
            params: {
              content_filter: {
                type: "PruningContentFilter",
                params: {
                  threshold: PRUNE_THRESHOLD,
                  threshold_type: "dynamic",
                  min_word_threshold: 8,
                },
              },
            },
          },
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new FetchPostingError(
        res.status === 401 || res.status === 403
          ? "Crawl4AI rejected the API key."
          : `Crawl4AI returned ${res.status}.`,
      );
    }

    const data = (await res.json()) as {
      success?: boolean;
      results?: Crawl4aiResult[];
      detail?: string;
    };

    const first = data.results?.[0];

    // A 200 can still carry a per-URL failure — the browser navigated and the
    // site refused, or the page never settled. Report that as itself rather
    // than as "returned nothing readable", which sends you looking at the
    // wrong end of the problem.
    if (first && first.success === false) {
      throw new FetchPostingError(
        `Crawl4AI could not load that page${first.error_message ? `: ${first.error_message.slice(0, 160)}` : "."}`,
      );
    }
    if (!first) {
      throw new FetchPostingError(
        data.detail ? `Crawl4AI: ${data.detail.slice(0, 160)}` : "Crawl4AI returned no result.",
      );
    }

    // Prefer the pruned markdown, then the raw, then the cleaned HTML. Each
    // fallback is a real shape some Crawl4AI build returns, not defensive
    // padding — the markdown field changed type between versions.
    const md = first.markdown;
    const text =
      (typeof md === "object" ? md.fit_markdown?.trim() : "") ||
      (typeof md === "string" ? md.trim() : md?.raw_markdown?.trim()) ||
      (first.cleaned_html ? extractText(first.cleaned_html) : "");

    if (!text || text.length < 200) {
      throw new FetchPostingError(
        "Crawl4AI reached the page but found almost no text on it.",
      );
    }

    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** The plain-HTTP path. Used on its own, and as Crawl4AI's fallback. */
async function viaPlainFetch(url: URL): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Identify honestly. A site that would rather not serve a tool can
        // then say so, which is the point of sending one at all.
        "user-agent":
          "JobOS/1.0 (+https://job.imswarnil.com) single-page fetch on user request",
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      throw new FetchPostingError(
        res.status === 403 || res.status === 401
          ? "That site refused the request. Paste the description text instead."
          : `That page returned ${res.status}. Paste the description text instead.`,
      );
    }

    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html") && !type.includes("text")) {
      throw new FetchPostingError("That link is not a web page.");
    }

    const html = (await res.text()).slice(0, MAX_BYTES);
    const text = extractText(html);

    if (text.length < 200) {
      throw new FetchPostingError(
        "That page had almost no text — it probably renders the description with JavaScript. Set up Crawl4AI, or paste the text instead.",
      );
    }

    return text;
  } catch (error) {
    if (error instanceof FetchPostingError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new FetchPostingError("That page took too long. Paste the text instead.");
    }
    throw new FetchPostingError(
      "Could not reach that page. Paste the description text instead.",
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches one posting and returns its readable text.
 *
 * Crawl4AI first when it is configured, plain HTTP otherwise — and plain HTTP
 * again if Crawl4AI fails for any reason. That order is the whole design: the
 * browser-rendered path is strictly better when it works, and when the VPS is
 * down the feature degrades to what it was rather than to nothing.
 *
 * Throws `FetchPostingError` with something a person can act on. This runs on
 * a user action, and "failed to fetch" is not a useful thing to read.
 */
export async function fetchPosting(rawUrl: string): Promise<string> {
  const url = assertPublicHttpUrl(rawUrl.trim());
  const crawl = process.env.CRAWL4AI_BASE_URL?.trim();

  if (crawl) {
    try {
      return await viaCrawl4ai(url.toString(), crawl);
    } catch (error) {
      // Logged rather than surfaced: the user asked for a job description,
      // not a status report on the VPS. If the fallback also fails they get
      // its message, which is the one they can act on. The settings screen is
      // where "is Crawl4AI up" gets answered properly.
      console.warn(
        "[crawl4ai] falling back to plain fetch —",
        (error as Error).message,
      );
    }
  }

  return viaPlainFetch(url);
}
