import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Building2, NotebookPen, SearchX } from "lucide-react";

import {
  countsByDay,
  countsByType,
  earliestEntryDate,
  listEntries,
} from "@/lib/journal/queries";
import { currentOrgId, listOrgs, listProjects } from "@/lib/career/queries";
import { LOG_TYPES, logTypeMeta } from "@/lib/journal/types";
import { monthBounds, parseMonth } from "@/lib/journal/calendar";
import type { LogType } from "@/lib/db/schema";
import { PageHeader } from "@/components/page-header";
import { EntryCard } from "@/components/journal/entry-card";
import { EntryComposer } from "@/components/journal/entry-composer";
import { TypeFilter } from "@/components/journal/type-filter";
import { JournalSearch } from "@/components/journal/journal-search";
import { ViewSwitcher } from "@/components/journal/view-switcher";
import { parseView } from "@/lib/journal/views";
import { CalendarView } from "@/components/journal/calendar-view";
import { BoardNote, BoardView } from "@/components/journal/board-view";

export const metadata: Metadata = { title: "Journal" };
export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(LOG_TYPES.map((t) => t.id));

interface Params {
  type?: string;
  q?: string;
  view?: string;
  month?: string;
  day?: string;
  compose?: string;
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;

  const type =
    params.type && VALID_TYPES.has(params.type as LogType)
      ? (params.type as LogType)
      : undefined;

  const view = parseView(params.view);

  const filter = { type, q: params.q };

  // The calendar works a month at a time; the other two want everything.
  const { year, month } = parseMonth(params.month);
  const bounds = monthBounds(year, month);
  const listFilter =
    view === "calendar" ? { ...filter, ...bounds, limit: 400 } : filter;

  const [entries, counts, companies, projects, currentCompany] =
    await Promise.all([
      listEntries(listFilter),
      // Same filter, minus the type — so each chip counts its own matches.
      countsByType(filter),
      listOrgs(),
      listProjects(),
      currentOrgId(),
    ]);

  const [dayCounts, earliest] =
    view === "calendar"
      ? await Promise.all([
          countsByDay(bounds.from, bounds.to, filter),
          earliestEntryDate(),
        ])
      : [{}, null];

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // Passed to the calendar so paging months keeps the type and search filters.
  const query = new URLSearchParams();
  if (params.type) query.set("type", params.type);
  if (params.q) query.set("q", params.q);

  const wide = view === "board";

  return (
    <div
      className={
        wide ? "w-full space-y-6" : "mx-auto w-full max-w-4xl space-y-6"
      }
    >
      <PageHeader
        title="Work journal"
        description="Everything that made you better at your job — what you shipped, what you learned, what went wrong, and the tricks worth keeping. A company is optional; plenty of this happens on a Sunday."
        actions={
          <Link
            href="/setup"
            className="fx-press inline-flex h-10 items-center gap-2 rounded-control border border-line bg-surface px-3 text-sm font-medium text-fg-muted transition-colors duration-200 ease-out hover:border-line-strong hover:text-fg"
          >
            <Building2 className="h-4 w-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Career setup</span>
          </Link>
        }
      />

      <EntryComposer
        companies={companies}
        projects={projects}
        currentCompanyId={currentCompany}
      />

      <Suspense fallback={<div className="h-24" />}>
        <div className="space-y-4">
          <JournalSearch />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TypeFilter counts={counts} total={total} />
            <ViewSwitcher view={view} />
          </div>
        </div>
      </Suspense>

      {view === "calendar" ? (
        <CalendarView
          year={year}
          month={month}
          counts={dayCounts}
          entries={entries}
          selected={params.day}
          query={query}
          earliest={earliest}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          type={type}
          query={params.q?.trim() || undefined}
          hasAny={total > 0}
        />
      ) : view === "board" ? (
        <div className="space-y-3">
          <BoardNote />
          <BoardView entries={entries} />
        </div>
      ) : (
        <div className="fx-stagger space-y-3">
          {entries.map((entry, i) => (
            <div key={entry.id} style={{ "--i": i } as React.CSSProperties}>
              <EntryCard entry={entry} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  type,
  query,
  hasAny,
}: {
  type?: LogType;
  query?: string;
  hasAny: boolean;
}) {
  const meta = type ? logTypeMeta(type) : null;
  const filtered = Boolean(type) || Boolean(query);

  // Three different nothings, and they mean different things: no entries at
  // all, none of this kind, or none matching a search.
  let heading: string;
  let body: string;

  if (query) {
    heading = `Nothing matches “${query}”`;
    body = type
      ? `No ${meta?.label.toLowerCase()} entries mention that. Try clearing the filter, or searching for something else.`
      : "Search covers the title, the entry itself and the impact. Try a shorter phrase.";
  } else if (type) {
    heading = `No ${meta?.label.toLowerCase()} entries yet`;
    body = meta?.prompt ?? "";
  } else if (hasAny) {
    heading = "Nothing here";
    body = "Clear the filters to see your entries.";
  } else {
    heading = "Nothing logged yet";
    body =
      "The hardest part is the first entry. Write down one thing from today — it does not have to be impressive, it has to be true.";
  }

  return (
    <div className="fx-fade relative overflow-hidden rounded-card border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="relative mx-auto max-w-sm space-y-2">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-control border border-line bg-surface text-fg-muted shadow-e1">
          {filtered ? (
            <SearchX className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <NotebookPen className="h-5 w-5" strokeWidth={1.75} />
          )}
        </span>
        <h3 className="text-base font-semibold text-fg">{heading}</h3>
        <p className="text-sm leading-relaxed text-fg-muted">{body}</p>
      </div>
    </div>
  );
}
