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
 * `CRAWL4AI_BASE_URL` swaps in a Crawl4AI instance for pages that need a real
 * browser — many job boards render the description client-side, and plain
 * HTML then yields an empty shell. Same single-page limit either way.
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

async function viaCrawl4ai(url: string, base: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (process.env.CRAWL4AI_API_KEY) {
      headers.authorization = `Bearer ${process.env.CRAWL4AI_API_KEY}`;
    }

    const res = await fetch(`${base.replace(/\/$/, "")}/crawl`, {
      method: "POST",
      headers,
      body: JSON.stringify({ urls: [url], crawler_config: { cache_mode: "bypass" } }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new FetchPostingError(`Crawl4AI returned ${res.status}.`);
    }

    const data = (await res.json()) as {
      results?: { markdown?: string | { raw_markdown?: string }; cleaned_html?: string }[];
    };

    const first = data.results?.[0];
    const markdown =
      typeof first?.markdown === "string"
        ? first.markdown
        : first?.markdown?.raw_markdown;

    const text = markdown ?? (first?.cleaned_html ? extractText(first.cleaned_html) : "");
    if (!text.trim()) throw new FetchPostingError("Crawl4AI returned nothing readable.");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches one posting and returns its readable text.
 *
 * Throws `FetchPostingError` with something a person can act on — this runs
 * on a user action, and "failed to fetch" is not a useful thing to read.
 */
export async function fetchPosting(rawUrl: string): Promise<string> {
  const url = assertPublicHttpUrl(rawUrl.trim());

  const crawl = process.env.CRAWL4AI_BASE_URL;
  if (crawl) {
    return viaCrawl4ai(url.toString(), crawl);
  }

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
        "That page had almost no text — it probably renders the description with JavaScript. Paste the text instead.",
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
