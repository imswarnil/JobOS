import { LOG_TYPES } from "@/lib/journal/types";
import type { LogType } from "@/lib/db/schema";

/**
 * ONE LINE IN, A COMPLETE ENTRY OUT
 * =================================
 *
 * The composer used to ask for a type, a title, a body, a company, a project,
 * an impact, challenges, tech tags, tags and minutes. Most were optional, but
 * optional fields still *read* as work — ten boxes look like ten boxes, and
 * the cost of writing anything at all goes up. The entry you do not write is
 * the only one that matters here.
 *
 * So the whole form collapses to a sentence. "fixed the migration yesterday"
 * is a complete entry: title, date, and a type inferred from the verb.
 *
 * Pure and synchronous on purpose — it runs on every keystroke so you can see
 * what it understood *before* you commit to it. A parser you cannot see is a
 * parser that will silently file something under the wrong day, and you will
 * find out months later when the resume is wrong.
 *
 * Nothing here is clever. Every rule is one a person would guess, and
 * anything it does not recognise stays in the title untouched — the failure
 * mode is "it did not help", never "it changed what you wrote".
 */

export interface QuickEntry {
  /** What is left after the date phrase is lifted out. */
  title: string;
  /** ISO date, always resolved — defaults to today. */
  date: string;
  type: LogType;
  /** What the parser matched, for the hint under the box. Empty when nothing. */
  matchedDate: string | null;
  /** True when the type was inferred rather than defaulted. */
  inferredType: boolean;
}

/* ── Type, from the verb ─────────────────────────────────────────────────── */

/**
 * Opening verbs that reliably indicate a kind of entry.
 *
 * Only the opening word or two is considered. "I learned that the deploy
 * broke" is a learning; "fixed the thing that broke while I was learning" is
 * not, and scanning the whole sentence would get that wrong.
 */
const TYPE_HINTS: Array<{ type: LogType; patterns: RegExp }> = [
  {
    type: "learning",
    patterns: /^(learned|learnt|read|studied|discovered|found out|realised|realized|understood)\b/i,
  },
  {
    type: "win",
    patterns: /^(shipped|launched|released|landed|won|got|closed|delivered|finished|completed)\b/i,
  },
  {
    type: "setback",
    patterns: /^(broke|failed|lost|missed|regressed|reverted|rolled back|screwed up|messed up)\b/i,
  },
  {
    type: "challenge",
    patterns: /^(struggled|stuck|blocked|fought|wrestled|debugged|chased|spent hours)\b/i,
  },
  {
    type: "trick",
    patterns: /^(til|tip|trick|shortcut|turns out|handy)\b/i,
  },
];

function inferType(text: string): LogType | null {
  const trimmed = text.trim().replace(/^i\s+/i, "");
  for (const { type, patterns } of TYPE_HINTS) {
    if (patterns.test(trimmed)) return type;
  }
  return null;
}

/* ── Date, from the phrase ───────────────────────────────────────────────── */

const DAYS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

function iso(date: Date): string {
  // Local date, not UTC. `toISOString` on a local midnight in a positive
  // offset silently reports yesterday, which is exactly the class of bug this
  // parser must not have.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shift(from: Date, days: number): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Lifts a trailing or leading date phrase out of the line.
 *
 * Only anchored phrases are matched — at the start or the end — because a
 * date word in the middle of a sentence is usually part of what happened
 * ("moved the Friday deploy to Monday") rather than when it happened.
 */
function extractDate(
  text: string,
  now: Date,
): { rest: string; date: Date; matched: string | null } {
  const patterns: Array<{ re: RegExp; resolve: (m: RegExpMatchArray) => Date }> = [
    { re: /\btoday\b/i, resolve: () => now },
    { re: /\byesterday\b/i, resolve: () => shift(now, -1) },
    { re: /\bday before yesterday\b/i, resolve: () => shift(now, -2) },
    {
      re: /\b(\d+)\s+days?\s+ago\b/i,
      resolve: (m) => shift(now, -Number(m[1])),
    },
    {
      re: /\b(a|one)\s+week\s+ago\b/i,
      resolve: () => shift(now, -7),
    },
    {
      re: /\b(\d+)\s+weeks?\s+ago\b/i,
      resolve: (m) => shift(now, -7 * Number(m[1])),
    },
    {
      /**
       * "last monday" / "on friday" — the most recent one that has already
       * happened, because a journal records the past.
       *
       * The preposition is required, and that is not fussiness. A bare
       * trailing day name is ambiguous in a way that matters: "moved the
       * Friday deploy to Monday" ends in a day and is entirely content, and
       * matching it files the entry under the wrong day *silently*. "on" or
       * "last" is how people write the date sense and almost never how they
       * write the content sense.
       *
       * The cost is that "shipped it monday" gets today instead. That is the
       * right way round to be wrong: the hint under the box shows the date it
       * chose, so a missed match is visible and a wrong one is not.
       */
      re: new RegExp(`\\b(?:last|on)\\s+(${DAYS.join("|")})\\b`, "i"),
      resolve: (m) => {
        const target = DAYS.indexOf(m[1].toLowerCase());
        const back = (now.getDay() - target + 7) % 7;
        return shift(now, back === 0 ? -7 : -back);
      },
    },
  ];

  for (const { re, resolve } of patterns) {
    // Anchored: the phrase must sit at one end of the line.
    const anchored = new RegExp(`(^\\s*${re.source}\\s*|\\s*${re.source}\\s*$)`, "i");
    const match = text.match(anchored);
    if (!match) continue;

    const inner = text.match(re);
    if (!inner) continue;

    return {
      rest: text.replace(anchored, " ").replace(/\s+/g, " ").trim(),
      date: resolve(inner),
      matched: inner[0],
    };
  }

  return { rest: text.trim(), date: now, matched: null };
}

/* ── The whole thing ─────────────────────────────────────────────────────── */

export function parseQuickEntry(
  input: string,
  now: Date = new Date(),
): QuickEntry {
  const { rest, date, matched } = extractDate(input, now);
  const type = inferType(rest);

  return {
    // Leading "I " is implied on a resume and in a journal alike.
    title: rest.replace(/^i\s+/i, "").trim(),
    date: iso(date),
    type: type ?? "work",
    matchedDate: matched,
    inferredType: type !== null,
  };
}

/** "Monday 25 Aug" — how the hint names a resolved date. */
export function describeDate(isoDate: string, now: Date = new Date()): string {
  const d = new Date(`${isoDate}T00:00:00`);
  const today = iso(now);
  const yesterday = iso(shift(now, -1));

  if (isoDate === today) return "today";
  if (isoDate === yesterday) return "yesterday";

  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

/** The label and icon for a type, for the hint row. */
export function typeMeta(type: LogType) {
  return LOG_TYPES.find((t) => t.id === type) ?? LOG_TYPES[0];
}
