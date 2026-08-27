/**
 * GROUNDING CHECK
 * ===============
 *
 * The prompt tells the model not to invent facts. This checks whether it
 * listened, because "we asked it nicely" is not a safety property.
 *
 * It is deliberately narrow rather than clever. Judging whether a rewritten
 * sentence is *semantically* supported needs another model call and would be
 * wrong often enough to be untrustworthy. Instead this catches the one class
 * of fabrication that is both the most damaging and the most cheaply
 * detectable: **numbers that appear in the output and nowhere in the
 * sources.**
 *
 * That is the failure that ends interviews. "Reduced latency by 40%" when the
 * journal only ever said "made it faster" is not a rewrite, it is a lie the
 * candidate now has to defend in a room.
 *
 * Findings are surfaced to the user, not silently corrected. A flagged bullet
 * might be fine — the model may have restated "three hours to eighteen
 * minutes" as "3h → 18m" — so the person who has to say these things out loud
 * gets to decide.
 */

export interface GroundingIssue {
  /** Where it was found, for the UI. */
  section: string;
  item: string;
  bullet: string;
  /** The specific tokens that do not appear in any source. */
  unsupported: string[];
}

/**
 * Numbers, percentages, durations and multipliers.
 *
 * Deliberately includes the unit, so "18m" and "18%" are different claims —
 * matching bare digits would let "18 minutes" vouch for "18%".
 */
const NUMERIC = /\b\d[\d,.]*\s*(?:%|percent|x|k|m|bn|b|hrs?|hours?|mins?|minutes?|days?|weeks?|months?|years?|ms|s|gb|tb|mb)?\b/gi;

/** Strips formatting differences that are not claims: commas, spaces, case. */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .replace(/hours?|hrs?/g, "h")
    .replace(/minutes?|mins?/g, "m")
    .replace(/percent/g, "%");
}

function numbersIn(text: string): string[] {
  return (text.match(NUMERIC) ?? [])
    .map((n) => n.trim())
    // A bare year is not a metric, and dates legitimately move around.
    .filter((n) => !/^(19|20)\d{2}$/.test(n.replace(/\D/g, "")));
}

/**
 * Every numeric claim in `bullet` that no source vouches for.
 *
 * Sources are joined and normalised once by the caller — this runs per bullet
 * across a whole resume, and re-normalising the corpus each time would be
 * quadratic for no reason.
 */
export function unsupportedNumbers(
  bullet: string,
  normalisedSources: string,
): string[] {
  const claims = numbersIn(bullet);
  if (!claims.length) return [];

  const unsupported = claims.filter(
    (claim) => !normalisedSources.includes(normalise(claim)),
  );

  // De-duplicate, preserving the form the model actually wrote.
  return [...new Set(unsupported)];
}

/** Builds the haystack once. */
export function buildSourceCorpus(parts: (string | null | undefined)[]): string {
  return normalise(parts.filter(Boolean).join(" "));
}
