import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { JournalEntry } from "@/lib/journal/queries";
import { logTypeMeta } from "@/lib/journal/types";
import {
  WEEKDAYS,
  mondayOf,
  shiftWeek,
  todayIso,
  weekGrid,
  weekLabel,
} from "@/lib/journal/calendar";
import { NavLink } from "@/components/journal/calendar-nav";
import { cn } from "@/lib/utils";

/**
 * Seven days, each a column of whole entries.
 *
 * Not an hour grid, because `occurred_on` is a Postgres `date` and there is
 * no time of day to place anything at. Inventing one — defaulting to 09:00,
 * or asking for a time on every entry — would buy a familiar-looking layout
 * at the cost of the thing the journal is actually built around, which is
 * that logging has to be fast enough to happen at all.
 *
 * So the week trades the month's density for detail: where a month cell can
 * only afford a dot, a column has room for the title and where it happened.
 */
export function WeekView({
  monday,
  entries,
  query,
  earliest,
}: {
  monday: string;
  /** Entries for this week, newest first. */
  entries: JournalEntry[];
  /** Preserved across navigation. */
  query: URLSearchParams;
  earliest: string | null;
}) {
  const days = weekGrid(monday);
  const prev = shiftWeek(monday, -1);
  const next = shiftWeek(monday, 1);

  function weekHref(target: string) {
    const p = new URLSearchParams(query);
    p.set("view", "calendar");
    p.set("span", "week");
    p.set("week", target);
    return `/journal?${p.toString()}`;
  }

  // Nothing before the first entry is worth offering.
  const prevIsEmpty = earliest ? shiftWeek(monday, -1) < mondayOf(earliest) : true;

  const byDay = new Map<string, JournalEntry[]>();
  for (const entry of entries) {
    const bucket = byDay.get(entry.occurredOn);
    if (bucket) bucket.push(entry);
    else byDay.set(entry.occurredOn, [entry]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-base font-semibold text-fg">
            {weekLabel(monday)}
          </h2>
          <span className="t-num text-xs text-fg-subtle">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <NavLink
            href={weekHref(prev)}
            label="Previous week"
            disabled={prevIsEmpty}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </NavLink>
          <Link
            href={weekHref(mondayOf(todayIso()))}
            scroll={false}
            className="fx-press rounded-control px-2.5 py-1.5 text-xs font-semibold text-fg-subtle hover:bg-sunken hover:text-fg"
          >
            This week
          </Link>
          <NavLink href={weekHref(next)} label="Next week">
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </NavLink>
        </div>
      </div>

      {/* Scrolls sideways below seven readable columns rather than crushing
          them — a 40px-wide column of prose is worse than a swipe. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        <div className="grid min-w-[52rem] grid-cols-7 gap-2">
          {days.map((day, i) => {
            const listed = byDay.get(day.date) ?? [];

            return (
              <section
                key={day.date}
                aria-label={`${WEEKDAYS[i]} ${day.date}, ${listed.length} ${
                  listed.length === 1 ? "entry" : "entries"
                }`}
                className={cn(
                  "flex flex-col rounded-card border bg-sunken/60",
                  day.isToday ? "border-line-accent" : "border-line",
                  day.isFuture && "opacity-45",
                )}
              >
                <header
                  className={cn(
                    "flex items-baseline gap-1.5 border-b px-2.5 py-2",
                    day.isToday ? "border-line-accent" : "border-line-subtle",
                  )}
                >
                  <span className="t-slate">{WEEKDAYS[i]}</span>
                  <span
                    className={cn(
                      "t-num text-sm",
                      day.isToday
                        ? "font-bold text-fg-accent"
                        : "font-semibold text-fg",
                    )}
                  >
                    {day.day}
                  </span>
                  {listed.length ? (
                    <span className="t-num ml-auto text-xs text-fg-faint">
                      {listed.length}
                    </span>
                  ) : null}
                </header>

                <div className="fx-stagger flex-1 space-y-1.5 p-1.5">
                  {listed.map((entry, n) => {
                    const meta = logTypeMeta(entry.type);
                    const Icon = meta.icon;

                    return (
                      <article
                        key={entry.id}
                        style={{ "--i": n } as React.CSSProperties}
                        className="fx-lift rounded-control border border-line bg-surface p-2 shadow-e1"
                      >
                        <div className="flex items-start gap-1.5">
                          <Icon
                            className="mt-0.5 h-3 w-3 shrink-0 text-fg-faint"
                            strokeWidth={2}
                          />
                          <p className="min-w-0 flex-1 text-xs leading-snug font-semibold text-fg">
                            {entry.title}
                          </p>
                        </div>
                        <p className="mt-1 truncate text-[0.6875rem] text-fg-subtle">
                          {entry.companyName ?? "Personal"}
                          {entry.projectName ? ` · ${entry.projectName}` : ""}
                        </p>
                      </article>
                    );
                  })}

                  {listed.length === 0 && !day.isFuture ? (
                    <p
                      className="px-1 py-4 text-center text-[0.6875rem] text-fg-faint"
                      aria-hidden
                    >
                      —
                    </p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
