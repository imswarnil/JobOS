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
import {
  monthBounds,
  parseMonth,
  parseWeek,
  parseYear,
  todayIso,
  weekBounds,
  yearBounds,
} from "@/lib/journal/calendar";
import { groupEntries, parseGrouping } from "@/lib/journal/grouping";
import type { LogType } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EntryCard } from "@/components/journal/entry-card";
import { EntryComposer } from "@/components/journal/entry-composer";
import { TypeFilter } from "@/components/journal/type-filter";
import { JournalSearch } from "@/components/journal/journal-search";
import { ViewSwitcher } from "@/components/journal/view-switcher";
import { parseSpan, parseView } from "@/lib/journal/views";
import { CalendarView } from "@/components/journal/calendar-view";
import { WeekView } from "@/components/journal/week-view";
import { YearView } from "@/components/journal/year-view";
import { SpanSwitcher } from "@/components/journal/span-switcher";
import { GroupSwitcher } from "@/components/journal/group-switcher";
import { Refine } from "@/components/journal/refine";
import { BoardNote, BoardView } from "@/components/journal/board-view";

export const metadata: Metadata = { title: "Journal" };
export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(LOG_TYPES.map((t) => t.id));

interface Params {
  type?: string;
  q?: string;
  view?: string;
  span?: string;
  week?: string;
  month?: string;
  year?: string;
  day?: string;
  group?: string;
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
  const span = parseSpan(params.span);
  const group = parseGrouping(params.group);

  const filter = { type, q: params.q };

  /*
   * Each span reads its own anchor, so all three stay live in the URL and
   * switching back and forth does not lose where you were.
   */
  const monday = parseWeek(params.week);
  const { year: monthYear, month } = parseMonth(params.month);
  const year = parseYear(params.year);

  const bounds =
    span === "week"
      ? weekBounds(monday)
      : span === "year"
        ? yearBounds(year)
        : monthBounds(monthYear, month);

  /*
   * The year view draws from `countsByDay`, a SQL aggregate over the whole
   * year, and never lists entries — so it does not pay to fetch them. Week
   * and month do list them, and 400 is far above any real span.
   */
  const listFilter =
    view !== "calendar"
      ? filter
      : span === "year"
        ? { ...filter, ...bounds, limit: 1 }
        : { ...filter, ...bounds, limit: 400 };

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

  // Passed to the calendar so paging keeps the type and search filters.
  const query = new URLSearchParams();
  if (params.type) query.set("type", params.type);
  if (params.q) query.set("q", params.q);
  if (params.group) query.set("group", params.group);

  /*
   * A day inside whatever is on screen, so changing span keeps its place.
   * Today when today is in range, because "this month → week" should land on
   * this week rather than the 1st.
   */
  const today = todayIso();
  const anchor =
    today >= bounds.from && today <= bounds.to ? today : bounds.from;

  /*
   * `kind` is the default and writes no param, which is what keeps the list
   * chronological and the board six columns unless you ask for otherwise.
   */
  const grouped = group !== "kind";

  const wide = view === "board" || (view === "calendar" && span === "week");

  return (
    <div
      className={
        wide ? "w-full space-y-6" : "mx-auto w-full max-w-4xl space-y-6"
      }
    >
      <PageHeader
        title="Work journal"
        description="What you shipped, learned, broke and figured out."
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
        {/* One row: what you filter by, how you look at it, and everything
            else folded away. Seven controls above the first entry was the
            problem; three is a screen you can read. */}
        <div className="flex flex-wrap items-center gap-3">
          <TypeFilter counts={counts} total={total} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {view === "calendar" ? (
              <SpanSwitcher span={span} anchor={anchor} />
            ) : null}
            <ViewSwitcher view={view} />
            <Refine active={Boolean(params.q) || group !== "kind"}>
              <JournalSearch />
              {/* Grouping restructures the list and the board. It is not
                  offered in the calendar, where time is already the
                  organising axis and a second one would fight it. */}
              {view === "calendar" ? null : <GroupSwitcher group={group} />}
            </Refine>
          </div>
        </div>
      </Suspense>

      {view === "calendar" ? (
        span === "week" ? (
          <WeekView
            monday={monday}
            entries={entries}
            query={query}
            earliest={earliest}
          />
        ) : span === "year" ? (
          <YearView
            year={year}
            counts={dayCounts}
            query={query}
            earliest={earliest}
          />
        ) : (
          <CalendarView
            year={monthYear}
            month={month}
            counts={dayCounts}
            entries={entries}
            selected={params.day}
            query={query}
            earliest={earliest}
          />
        )
      ) : entries.length === 0 ? (
        <EmptyState
          type={type}
          query={params.q?.trim() || undefined}
          hasAny={total > 0}
        />
      ) : view === "board" ? (
        <div className="space-y-3">
          <BoardNote grouping={group} />
          <BoardView groups={groupEntries(entries, group)} />
        </div>
      ) : grouped ? (
        <div className="space-y-6">
          {groupEntries(entries, group).map((section) => (
            <section key={section.key} className="space-y-3">
              <div className="flex items-baseline gap-2.5 border-b border-line-subtle pb-1.5">
                <h2
                  className={cn(
                    "text-sm font-semibold",
                    section.isUnassigned ? "text-fg-muted" : "text-fg",
                  )}
                >
                  {section.label}
                </h2>
                <span className="t-num text-xs text-fg-faint">
                  {section.entries.length}
                </span>
              </div>

              <div className="fx-stagger space-y-3">
                {section.entries.map((entry, i) => (
                  <div key={entry.id} style={{ "--i": i } as React.CSSProperties}>
                    <EntryCard entry={entry} />
                  </div>
                ))}
              </div>
            </section>
          ))}
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
