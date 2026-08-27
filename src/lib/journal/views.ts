/**
 * The journal's view modes.
 *
 * Deliberately *not* in the client component that renders the switcher: a
 * `"use client"` module may only hand real values across the RSC boundary for
 * function exports. A plain array becomes an unusable proxy, and a server
 * component calling `.includes()` on it fails at runtime with
 * "includes is not a function". Shared constants belong in a shared module.
 */
export const JOURNAL_VIEWS = ["list", "calendar", "board"] as const;

export type JournalView = (typeof JOURNAL_VIEWS)[number];

export function parseView(value: string | undefined): JournalView {
  return JOURNAL_VIEWS.includes(value as JournalView)
    ? (value as JournalView)
    : "list";
}

/**
 * How much time the calendar shows at once.
 *
 * A separate axis from the view, not three more entries in `JOURNAL_VIEWS`:
 * "calendar" is the way of looking and week/month/year is how far you are
 * standing back, and folding them together would make `?view=week` mean two
 * things at once and multiply every switcher.
 *
 * Each span reads its own anchor param — `week=YYYY-MM-DD`, `month=YYYY-MM`,
 * `year=YYYY` — so a link says what it shows, and every `month=` URL from
 * before spans existed still resolves to the month it always did.
 */
export const CALENDAR_SPANS = ["week", "month", "year"] as const;

export type CalendarSpan = (typeof CALENDAR_SPANS)[number];

export function parseSpan(value: string | undefined): CalendarSpan {
  return CALENDAR_SPANS.includes(value as CalendarSpan)
    ? (value as CalendarSpan)
    : "month";
}

/** The anchor param a span reads, so callers can clear the other two. */
export const SPAN_PARAM: Record<CalendarSpan, string> = {
  week: "week",
  month: "month",
  year: "year",
};
