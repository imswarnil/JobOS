import type { LogType } from "@/lib/db/schema";
import type { JournalEntry } from "@/lib/journal/queries";
import { LOG_TYPES } from "@/lib/journal/types";

/**
 * How a set of entries is divided up, shared by every view.
 *
 * Grouping is done in memory rather than in SQL. `listEntries` already
 * returns `companyName`, `projectName` and both tag arrays, so a GROUP BY
 * would be a second round trip to re-derive what the first one fetched — and
 * the page is capped at 100 entries anyway. If that cap ever lifts, this is
 * the seam to move into the query.
 */

export const GROUPINGS = ["kind", "company", "project", "tag", "tech"] as const;

export type Grouping = (typeof GROUPINGS)[number];

export function parseGrouping(value: string | undefined): Grouping {
  return GROUPINGS.includes(value as Grouping) ? (value as Grouping) : "kind";
}

export const GROUPING_META: Record<
  Grouping,
  { label: string; hint: string }
> = {
  kind: { label: "Kind", hint: "Work, learning, win — the six log types" },
  company: { label: "Company", hint: "Employer or client, personal entries apart" },
  project: { label: "Project", hint: "The named piece of work" },
  tag: { label: "Tag", hint: "Your own labels" },
  tech: { label: "Tech", hint: "Languages, tools and platforms" },
};

export interface Group {
  /** The group-by value. Stable, so it works as a React key. */
  key: string;
  label: string;
  /** Set only when grouping by kind, so a view can reach the icon and prompt. */
  logType?: LogType;
  /**
   * True for the catch-all bucket — Personal, No project, Untagged.
   * Views sort it last and may style it back.
   */
  isUnassigned: boolean;
  entries: JournalEntry[];
}

/** The label for entries that have nothing in the grouped field. */
const UNASSIGNED: Record<Exclude<Grouping, "kind">, string> = {
  company: "Personal",
  project: "No project",
  tag: "Untagged",
  tech: "No tech",
};

/**
 * One key per entry, except for tags.
 *
 * An entry has one company and one project but any number of tags, so tag
 * grouping puts the same entry in several groups. That means the group counts
 * sum to more than the number of entries, which is correct rather than a bug:
 * the question "how much of my work touched Postgres" is not a partition.
 */
function keysFor(entry: JournalEntry, by: Grouping): { key: string; label: string }[] {
  switch (by) {
    case "kind":
      return [{ key: entry.type, label: entry.type }];
    case "company":
      return entry.companyId && entry.companyName
        ? [{ key: entry.companyId, label: entry.companyName }]
        : [];
    case "project":
      return entry.projectId && entry.projectName
        ? [{ key: entry.projectId, label: entry.projectName }]
        : [];
    case "tag":
      return entry.tags.map((t) => ({ key: `tag:${t}`, label: t }));
    case "tech":
      return entry.techTags.map((t) => ({ key: `tech:${t}`, label: t }));
  }
}

/**
 * Entries divided into groups, ordered for reading.
 *
 * Kind keeps the canonical order from `LOG_TYPES` and shows every type even
 * when empty, because the board's empty columns carry the composer prompt and
 * a column that vanishes when you have not used it is a feature you never
 * discover. Every other grouping shows only groups that exist, largest first,
 * with the catch-all bucket pinned last however big it is — "Personal" or
 * "Untagged" leading the page buries the ones you named.
 */
export function groupEntries(entries: JournalEntry[], by: Grouping): Group[] {
  if (by === "kind") {
    return LOG_TYPES.map((type) => ({
      key: type.id,
      label: type.label,
      logType: type.id,
      isUnassigned: false,
      entries: entries.filter((e) => e.type === type.id),
    }));
  }

  const groups = new Map<string, Group>();
  const orphans: JournalEntry[] = [];

  for (const entry of entries) {
    const keys = keysFor(entry, by);
    if (!keys.length) {
      orphans.push(entry);
      continue;
    }

    for (const { key, label } of keys) {
      const existing = groups.get(key);
      if (existing) existing.entries.push(entry);
      else groups.set(key, { key, label, isUnassigned: false, entries: [entry] });
    }
  }

  const ordered = [...groups.values()].sort(
    (a, b) =>
      b.entries.length - a.entries.length || a.label.localeCompare(b.label),
  );

  if (orphans.length) {
    ordered.push({
      key: "__none__",
      label: UNASSIGNED[by],
      isUnassigned: true,
      entries: orphans,
    });
  }

  return ordered;
}
