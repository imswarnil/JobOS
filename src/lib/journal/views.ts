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
