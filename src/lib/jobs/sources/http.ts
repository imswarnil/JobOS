/**
 * Shared plumbing for the board connectors.
 *
 * Greenhouse and Lever both publish one unauthenticated JSON feed per
 * company, with no search and no filtering — you fetch a company's whole
 * board and narrow it yourself. That shapes everything here: fetches are
 * per-board and must fail independently, and matching happens in this
 * process because the provider will not do it for you.
 */

const TIMEOUT_MS = 15_000;

export class SourceError extends Error {
  constructor(
    public source: string,
    public board: string,
    message: string,
  ) {
    super(message);
    this.name = "SourceError";
  }
}

/** A GET that gives up, so one unreachable board cannot hang a whole run. */
export async function fetchJson<T>(
  url: string,
  source: string,
  board: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      // These feeds change a few times a day at most, and a discovery run
      // may ask for the same board twice in a session.
      next: { revalidate: 900 },
    });

    if (!res.ok) {
      // A wrong board token is a 404, and that is a user error worth naming
      // rather than an outage.
      throw new SourceError(
        source,
        board,
        res.status === 404
          ? `No public board called "${board}"`
          : `HTTP ${res.status}`,
      );
    }

    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof SourceError) throw error;
    throw new SourceError(
      source,
      board,
      (error as Error).name === "AbortError"
        ? "Timed out"
        : (error as Error).message,
    );
  } finally {
    clearTimeout(timer);
  }
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  // Job descriptions are written in word processors, so smart punctuation is
  // the rule rather than the exception.
  "&rsquo;": "\u2019",
  "&lsquo;": "\u2018",
  "&rdquo;": "\u201d",
  "&ldquo;": "\u201c",
  "&mdash;": "\u2014",
  "&ndash;": "\u2013",
  "&hellip;": "\u2026",
  "&bull;": "\u2022",
  "&trade;": "\u2122",
  "&reg;": "\u00ae",
  "&copy;": "\u00a9",
};

const ENTITY_RE =
  /&(?:amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|rdquo|ldquo|mdash|ndash|hellip|bull|trade|reg|copy|#x?[0-9a-fA-F]+);/g;

/**
 * Greenhouse returns its description as entity-encoded HTML — the body
 * arrives as `&lt;div&gt;`, not `<div>`. So it has to be decoded before it
 * can be stripped, and decoded in a single pass: replacing `&amp;` first
 * would turn a literal `&amp;lt;` into a tag that was never there.
 */
export function decodeEntities(input: string): string {
  return input.replace(ENTITY_RE, (match) => {
    const known = ENTITIES[match];
    if (known) return known;

    const numeric = match.match(/^&#(x?)([0-9a-fA-F]+);$/);
    if (!numeric) return match;

    const code = parseInt(numeric[2], numeric[1] ? 16 : 10);
    // Lone surrogates and out-of-range values make fromCodePoint throw.
    if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
    if (code >= 0xd800 && code <= 0xdfff) return match;
    return String.fromCodePoint(code);
  });
}

/**
 * Tags to text. The stored description is read by a model, not rendered.
 *
 * Decoded twice, either side of the tag strip, because Greenhouse hands back
 * HTML that has itself been entity-encoded: a curly apostrophe leaves their
 * API as `&amp;rsquo;`, so one pass yields `&rsquo;` and stops. Decoding
 * before the strip is what turns `&lt;p&gt;` into a tag this can remove;
 * decoding after is what finishes the text inside it. The second pass is safe
 * precisely because it runs once no tags are left, so nothing it produces can
 * be mistaken for markup.
 */
export function stripHtml(input: string): string {
  const withoutTags = decodeEntities(input)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    // Block-level tags become breaks so paragraphs do not run together.
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  return decodeEntities(withoutTags)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Whether a posting matches, with no keywords meaning everything.
 *
 * OR rather than AND: these boards are one company at a time, so the list is
 * already narrow, and requiring every keyword on a page that says "Postgres"
 * but not "PostgreSQL" drops the role you were looking for.
 */
export function matchesKeywords(haystack: string, keywords: string[]): boolean {
  if (!keywords.length) return true;
  const text = haystack.toLowerCase();
  return keywords.some((k) => k.trim() && text.includes(k.trim().toLowerCase()));
}

/** Remote-ness is a string in both feeds, and never a reliable one. */
export function looksRemote(...parts: (string | undefined)[]): boolean {
  return parts.filter(Boolean).join(" ").toLowerCase().includes("remote");
}
