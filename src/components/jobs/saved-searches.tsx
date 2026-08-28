"use client";

import * as React from "react";
import { AlertTriangle, Plus, Search, Trash2, Clock } from "lucide-react";

import {
  addSearchAction,
  deleteSearchAction,
  runSearchNowAction,
  type SearchFormState,
} from "@/lib/jobs/search-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface SavedSearch {
  id: string;
  title: string;
  location: string | null;
  remote: boolean;
}

/**
 * THE TITLES BEING WATCHED
 * ========================
 *
 * A saved search is a job title plus where you'd take it. The schedule asks
 * Google for postings matching each one that were indexed in the last day,
 * and stores what is new.
 *
 * "Search now" exists because the alternative is adding a search and waiting
 * three hours to discover the query was wrong. The run reports what it did in
 * detail rather than saying "done" — a run that found forty postings and
 * imported none is a completely different situation from one that found none,
 * and both look identical behind a success message.
 */
export function SavedSearches({
  searches,
  configured,
}: {
  searches: SavedSearch[];
  configured: boolean;
}) {
  const [addState, addAction, adding] = React.useActionState<
    SearchFormState,
    FormData
  >(addSearchAction, {});
  const [runState, runAction, running] = React.useActionState<
    SearchFormState,
    FormData
  >(runSearchNowAction, {});

  const [open, setOpen] = React.useState(false);

  /**
   * Clearing the form after a save, by remount rather than by ref.
   *
   * `formRef.current.reset()` during render is the obvious version and is
   * wrong — refs are not readable while rendering, and the lint rule that
   * says so is right: the reset would race the commit. Changing the key makes
   * React build a fresh form, which is the same outcome with none of that.
   *
   * `searches.length` is the signal rather than `addState.ok`, because it
   * changes on every successful save; `ok` stays true across two saves in a
   * row and the second would not clear.
   */
  const formKey = `add-${searches.length}`;

  const r = runState.result;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Search className="h-4 w-4 text-fg-faint" strokeWidth={2} />
        <h2 className="text-sm font-semibold text-fg">Titles being watched</h2>
        <Badge tone="neutral" className="gap-1">
          <Clock className="h-2.5 w-2.5" strokeWidth={2.5} />
          every 3h
        </Badge>

        <div className="ml-auto flex items-center gap-2">
          <form action={runAction}>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="fx-tap"
              disabled={running || !searches.length || !configured}
            >
              <Search className="h-3.5 w-3.5" strokeWidth={2.25} />
              {running ? "Searching…" : "Search now"}
            </Button>
          </form>
          <Button
            type="button"
            variant={open ? "zest" : "primary"}
            size="sm"
            className="fx-tap"
            onClick={() => setOpen(!open)}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Add a title
          </Button>
        </div>
      </div>

      {!configured ? (
        <p className="mt-3 flex items-start gap-2 rounded-control border border-warning-line/40 bg-warning-bg px-3 py-2.5 text-xs leading-relaxed text-warning-fg">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span>
            Search is not configured yet. Set{" "}
            <code className="font-mono">GOOGLE_SEARCH_KEY</code> and{" "}
            <code className="font-mono">GOOGLE_SEARCH_CX</code> — see{" "}
            <code className="font-mono">docs/JOB-SEARCH.md</code> for the
            fifteen-minute setup. Titles saved here will start working the
            moment it is.
          </span>
        </p>
      ) : null}

      {searches.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {searches.map((s) => (
            <li key={s.id}>
              <span className="inline-flex items-center gap-2 rounded-pill border border-line bg-sunken py-1 pr-1 pl-3 text-xs">
                <span className="font-semibold text-fg">{s.title}</span>
                <span className="text-fg-subtle">
                  {s.remote ? "remote" : (s.location ?? "anywhere")}
                </span>
                <form action={deleteSearchAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    aria-label={`Stop watching ${s.title}`}
                    className="fx-tap grid h-5 w-5 place-items-center rounded-pill text-fg-faint hover:bg-danger-bg hover:text-danger-fg"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={2} />
                  </button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
          Nothing is being watched. Add a title — &ldquo;Salesforce
          Developer&rdquo;, &ldquo;Backend Engineer&rdquo; — and every three
          hours JobOS checks what was posted and ranks it against your journal.
        </p>
      )}

      {open ? (
        <form
          key={formKey}
          action={addAction}
          className="fx-bounce mt-3 flex flex-wrap items-end gap-2 rounded-control border border-line-subtle bg-sunken p-3"
        >
          <label className="min-w-40 flex-1">
            <span className="t-slate mb-1 block">Job title</span>
            <Input
              name="title"
              required
              maxLength={120}
              placeholder="Salesforce Developer"
            />
          </label>
          <label className="min-w-32 flex-1">
            <span className="t-slate mb-1 block">Where</span>
            <Input name="location" maxLength={120} placeholder="Bengaluru" />
          </label>
          <label className="flex h-10 items-center gap-2 text-sm text-fg-muted">
            <input
              type="checkbox"
              name="remote"
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Remote only
          </label>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="fx-tap"
            disabled={adding}
          >
            {adding ? "Saving…" : "Watch it"}
          </Button>
        </form>
      ) : null}

      {addState.error ? (
        <p role="alert" className="fx-wiggle mt-2 text-xs text-danger-fg">
          {addState.error}
        </p>
      ) : null}

      {runState.error ? (
        <p role="alert" className="fx-wiggle mt-2 text-xs text-danger-fg">
          {runState.error}
        </p>
      ) : null}

      {r ? (
        <div className="fx-bounce mt-3 space-y-1.5 rounded-control border border-line-subtle bg-sunken p-3">
          <p className="text-xs leading-relaxed text-fg">
            <strong className="font-semibold">
              {r.imported} new {r.imported === 1 ? "posting" : "postings"}
            </strong>{" "}
            from {r.searches} {r.searches === 1 ? "search" : "searches"}.
            Google returned {r.found}, {r.known} of which you already had
            {r.unread ? `, and ${r.unread} could not be read` : ""}
            {r.deferred ? `. ${r.deferred} left for the next run` : ""}.
          </p>
          {r.errors.length ? (
            <ul className="space-y-0.5">
              {r.errors.slice(0, 4).map((e, i) => (
                <li key={i} className="text-[0.6875rem] text-warning-fg">
                  {e}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
