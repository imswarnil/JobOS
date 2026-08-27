import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  WEEKDAYS,
  yearGrid,
  yearMonthLabels,
} from "@/lib/journal/calendar";
import { NavLink } from "@/components/journal/calendar-nav";
import { cn } from "@/lib/utils";

/**
 * The whole year as a density map — weeks across, weekdays down.
 *
 * A year is roughly 365 cells, which is far too many to label and exactly the
 * right number to show as colour. The question this view answers is not "what
 * did I do on 4 March" but "when did I stop writing things down", and a gap
 * in a wall of squares answers that in a glance where twelve month grids
 * would not.
 *
 * Clicking a square drops into that week, which is where the detail lives.
 */
export function YearView({
  year,
  counts,
  query,
  earliest,
}: {
  year: number;
  /** `{ "2026-08-26": 3 }` for the whole year. */
  counts: Record<string, number>;
  query: URLSearchParams;
  earliest: string | null;
}) {
  const weeks = yearGrid(year);
  const months = yearMonthLabels(weeks);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  function yearHref(target: number) {
    const p = new URLSearchParams(query);
    p.set("view", "calendar");
    p.set("span", "year");
    p.set("year", String(target));
    return `/journal?${p.toString()}`;
  }

  function weekHref(monday: string) {
    const p = new URLSearchParams(query);
    p.set("view", "calendar");
    p.set("span", "week");
    p.set("week", monday);
    return `/journal?${p.toString()}`;
  }

  const prevIsEmpty = earliest ? year - 1 < Number(earliest.slice(0, 4)) : true;
  const active = new Date().getFullYear();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 className="t-num text-base font-semibold text-fg">{year}</h2>
          <span className="t-num text-xs text-fg-subtle">
            {total} {total === 1 ? "entry" : "entries"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <NavLink
            href={yearHref(year - 1)}
            label="Previous year"
            disabled={prevIsEmpty}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </NavLink>
          <Link
            href={yearHref(active)}
            scroll={false}
            className="fx-press rounded-control px-2.5 py-1.5 text-xs font-semibold text-fg-subtle hover:bg-sunken hover:text-fg"
          >
            This year
          </Link>
          <NavLink
            href={yearHref(year + 1)}
            label="Next year"
            disabled={year >= active}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </NavLink>
        </div>
      </div>

      <div className="rounded-card border border-line bg-surface p-3 shadow-e1 sm:p-4">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="min-w-max">
            {/* Month axis. Positioned by grid column so it stays aligned with
                the weeks below however wide the squares end up. */}
            <div
              className="mb-1 grid gap-[3px] pl-7"
              style={{
                gridTemplateColumns: `repeat(${weeks.length}, 0.75rem)`,
              }}
              aria-hidden
            >
              {months.map(({ label, index }) => (
                <span
                  key={label + index}
                  className="t-slate whitespace-nowrap"
                  style={{ gridColumnStart: index + 1 }}
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {/* Weekday axis. Alternate rows only — seven labels at this size
                  is more ink than the grid itself. */}
              <div className="mr-1 grid w-6 gap-[3px]" aria-hidden>
                {WEEKDAYS.map((d, i) => (
                  <span
                    key={d}
                    className="t-slate flex h-3 items-center leading-none"
                  >
                    {i % 2 === 0 ? d[0] : ""}
                  </span>
                ))}
              </div>

              <div
                className="grid grid-flow-col gap-[3px]"
                style={{ gridTemplateRows: "repeat(7, 0.75rem)" }}
                role="grid"
                aria-label={`Entries in ${year}`}
              >
                {weeks.map((week) =>
                  week.days.map((day, i) =>
                    day ? (
                      <Link
                        key={day.date}
                        href={weekHref(week.key)}
                        scroll={false}
                        title={`${day.date} — ${counts[day.date] ?? 0} ${
                          (counts[day.date] ?? 0) === 1 ? "entry" : "entries"
                        }`}
                        aria-label={`${day.date}, ${counts[day.date] ?? 0} entries`}
                        className={cn(
                          "h-3 w-3 rounded-[3px] transition-colors duration-200 ease-out",
                          "hover:ring-1 hover:ring-line-accent",
                          intensity(counts[day.date] ?? 0),
                          day.isToday && "ring-1 ring-line-accent",
                          day.isFuture && "pointer-events-none opacity-40",
                        )}
                      />
                    ) : (
                      <span
                        key={`${week.key}-pad-${i}`}
                        className="h-3 w-3"
                        aria-hidden
                      />
                    ),
                  ),
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-1.5">
          <span className="t-slate">Less</span>
          {[0, 1, 2, 4, 6].map((n) => (
            <span
              key={n}
              className={cn("h-3 w-3 rounded-[3px]", intensity(n))}
              aria-hidden
            />
          ))}
          <span className="t-slate">More</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Five steps, because more are indistinguishable at 12px.
 *
 * The thresholds are deliberately tight — for a journal, three entries in a
 * day is already a busy day, and a scale built for dozens would render an
 * ordinary week as uniformly empty.
 */
function intensity(n: number): string {
  if (n === 0) return "bg-sunken";
  if (n === 1) return "bg-accent/30";
  if (n <= 3) return "bg-accent/55";
  if (n <= 5) return "bg-accent/80";
  return "bg-accent";
}
