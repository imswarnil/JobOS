"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, Columns3, Rows3 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { JournalView } from "@/lib/journal/views";

const OPTIONS = [
  { id: "list" as const, label: "List", icon: Rows3, hint: "Newest first" },
  { id: "calendar" as const, label: "Calendar", icon: CalendarDays, hint: "By day, month at a time" },
  { id: "board" as const, label: "Board", icon: Columns3, hint: "Grouped by kind" },
];

/**
 * Links rather than buttons, so the chosen view is in the URL and survives a
 * reload — and so a filtered calendar month is a thing you can send someone.
 */
export function ViewSwitcher({ view }: { view: JournalView }) {
  const pathname = usePathname();
  const params = useSearchParams();

  function hrefFor(next: JournalView) {
    const p = new URLSearchParams(params);
    if (next === "list") p.delete("view");
    else p.set("view", next);
    // A month only means something in the calendar.
    if (next !== "calendar") p.delete("month");
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-control border border-line bg-surface p-0.5"
      role="group"
      aria-label="Journal view"
    >
      {OPTIONS.map(({ id, label, icon: Icon, hint }) => {
        const active = id === view;
        return (
          <Link
            key={id}
            href={hrefFor(id)}
            scroll={false}
            title={hint}
            aria-current={active ? "true" : undefined}
            className={cn(
              "fx-press flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-semibold",
              "transition-colors duration-200 ease-out",
              active
                ? "bg-inverse text-fg-on-inverse"
                : "text-fg-subtle hover:text-fg",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
