"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { mondayOf } from "@/lib/journal/calendar";
import { CALENDAR_SPANS, type CalendarSpan } from "@/lib/journal/views";
import { cn } from "@/lib/utils";

const LABELS: Record<CalendarSpan, { label: string; hint: string }> = {
  week: { label: "Week", hint: "Seven days, in full" },
  month: { label: "Month", hint: "A month of days" },
  year: { label: "Year", hint: "The whole year at a glance" },
};

/**
 * How far back to stand in the calendar.
 *
 * The anchor travels between spans, so switching keeps you where you were:
 * looking at March and pressing Week gives you a week in March, not this
 * week. Landing back on today every time you changed span would make the
 * control useless for looking at the past, which is most of what a journal
 * is for.
 */
export function SpanSwitcher({
  span,
  anchor,
}: {
  span: CalendarSpan;
  /** A day inside whatever is currently shown. */
  anchor: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  function hrefFor(next: CalendarSpan) {
    const p = new URLSearchParams(params);
    p.set("view", "calendar");
    p.set("span", next);

    // Exactly one anchor at a time, or a stale param decides the next view.
    p.delete("week");
    p.delete("month");
    p.delete("year");
    p.delete("day");

    if (next === "week") p.set("week", mondayOf(anchor));
    if (next === "month") p.set("month", anchor.slice(0, 7));
    if (next === "year") p.set("year", anchor.slice(0, 4));

    return `${pathname}?${p.toString()}`;
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-control border border-line bg-surface p-0.5"
      role="group"
      aria-label="Calendar span"
    >
      {CALENDAR_SPANS.map((id) => {
        const active = id === span;
        return (
          <Link
            key={id}
            href={hrefFor(id)}
            scroll={false}
            title={LABELS[id].hint}
            aria-current={active ? "true" : undefined}
            className={cn(
              "fx-press flex h-8 items-center rounded-[6px] px-3 text-xs font-semibold",
              "transition-colors duration-200 ease-out",
              active
                ? "bg-inverse text-fg-on-inverse"
                : "text-fg-subtle hover:text-fg",
            )}
          >
            {LABELS[id].label}
          </Link>
        );
      })}
    </div>
  );
}
