import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { JournalEntry } from "@/lib/journal/queries";
import { logTypeMeta } from "@/lib/journal/types";
import {
  WEEKDAYS,
  monthGrid,
  monthKey,
  monthLabel,
  shiftMonth,
} from "@/lib/journal/calendar";
import { cn } from "@/lib/utils";

/**
 * A month at a time, with the entries for the selected day beneath it.
 *
 * The grid is always six rows so paging months does not change the page
 * height and move the controls out from under the cursor. Days outside the
 * month are shown but dimmed, because a week that straddles a boundary is
 * still a week you worked.
 */
export function CalendarView({
  year,
  month,
  counts,
  entries,
  selected,
  query,
  earliest,
}: {
  year: number;
  month: number;
  /** `{ "2026-08-26": 3 }` for the visible range. */
  counts: Record<string, number>;
  /** Entries for the whole month, ordered newest first. */
  entries: JournalEntry[];
  /** The day whose entries are listed below, if any. */
  selected?: string;
  /** Preserved across month navigation. */
  query: URLSearchParams;
  earliest: string | null;
}) {
  const cells = monthGrid(year, month);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  function monthHref(y: number, m: number) {
    const p = new URLSearchParams(query);
    p.set("view", "calendar");
    p.set("month", monthKey(y, m));
    p.delete("day");
    return `/journal?${p.toString()}`;
  }

  function dayHref(date: string) {
    const p = new URLSearchParams(query);
    p.set("view", "calendar");
    p.set("month", monthKey(year, month));
    if (selected === date) p.delete("day");
    else p.set("day", date);
    return `/journal?${p.toString()}`;
  }

  // No point offering months before the first entry.
  const prevIsEmpty = earliest
    ? monthKey(prev.year, prev.month) < earliest.slice(0, 7)
    : true;

  const listed = selected
    ? entries.filter((e) => e.occurredOn === selected)
    : entries;

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-line bg-surface p-3 shadow-e1 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-base font-semibold text-fg">
              {monthLabel(year, month)}
            </h2>
            <span className="t-num text-xs text-fg-subtle">
              {total} {total === 1 ? "entry" : "entries"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <NavLink
              href={monthHref(prev.year, prev.month)}
              label="Previous month"
              disabled={prevIsEmpty}
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </NavLink>
            <Link
              href={monthHref(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
              )}
              scroll={false}
              className="fx-press rounded-control px-2.5 py-1.5 text-xs font-semibold text-fg-subtle hover:bg-sunken hover:text-fg"
            >
              Today
            </Link>
            <NavLink href={monthHref(next.year, next.month)} label="Next month">
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </NavLink>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="t-slate pb-1 text-center">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d[0]}</span>
            </div>
          ))}

          {cells.map((cell) => {
            const n = counts[cell.date] ?? 0;
            const isSelected = selected === cell.date;

            return (
              <Link
                key={cell.date}
                href={dayHref(cell.date)}
                scroll={false}
                aria-label={`${cell.date}, ${n} ${n === 1 ? "entry" : "entries"}`}
                aria-current={isSelected ? "date" : undefined}
                className={cn(
                  "group relative flex aspect-square flex-col items-center justify-center gap-1 rounded-control border text-sm",
                  "transition-colors duration-200 ease-out",
                  isSelected
                    ? "border-line-accent bg-accent text-fg-on-accent"
                    : n > 0
                      ? "border-line bg-sunken text-fg hover:border-line-accent"
                      : "border-transparent text-fg-faint hover:bg-sunken",
                  !cell.inMonth && !isSelected && "opacity-40",
                  cell.isFuture && "pointer-events-none opacity-25",
                )}
              >
                <span
                  className={cn(
                    "t-num leading-none",
                    cell.isToday && !isSelected && "font-bold text-fg-accent",
                  )}
                >
                  {cell.day}
                </span>

                {/* Up to three dots, then a count. Dots read faster than a
                    number at a glance, but stop being useful past three. */}
                {n > 0 ? (
                  n <= 3 ? (
                    <span className="flex gap-0.5" aria-hidden>
                      {Array.from({ length: n }).map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1 w-1 rounded-pill",
                            isSelected ? "bg-fg-on-accent" : "bg-accent",
                          )}
                        />
                      ))}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "t-num text-[0.625rem] font-bold",
                        isSelected ? "text-fg-on-accent" : "text-fg-accent",
                      )}
                      aria-hidden
                    >
                      {n}
                    </span>
                  )
                ) : (
                  <span className="h-1" aria-hidden />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 className="t-slate">
            {selected ? `Entries on ${selected}` : `All of ${monthLabel(year, month)}`}
          </h3>
          {selected ? (
            <Link
              href={dayHref(selected)}
              scroll={false}
              className="text-xs font-semibold text-fg-accent hover:underline"
            >
              Show the whole month
            </Link>
          ) : null}
        </div>

        {listed.length ? (
          <ul className="fx-stagger space-y-2">
            {listed.map((entry, i) => {
              const meta = logTypeMeta(entry.type);
              const Icon = meta.icon;
              return (
                <li
                  key={entry.id}
                  style={{ "--i": i } as React.CSSProperties}
                  className="flex items-start gap-3 rounded-control border border-line-subtle bg-surface px-3 py-2.5"
                >
                  <Icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-fg-faint"
                    strokeWidth={1.75}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.8125rem] font-semibold text-fg">
                      {entry.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-fg-subtle">
                      {entry.occurredOn} · {meta.label}
                      {entry.companyName ? ` · ${entry.companyName}` : " · Personal"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-control border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-subtle">
            {selected
              ? "Nothing logged that day."
              : "Nothing logged this month."}
          </p>
        )}
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  disabled,
  children,
}: {
  href: string;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-control text-fg-faint opacity-30"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      aria-label={label}
      className="fx-press grid h-8 w-8 place-items-center rounded-control text-fg-muted transition-colors duration-200 ease-out hover:bg-sunken hover:text-fg"
    >
      {children}
    </Link>
  );
}
