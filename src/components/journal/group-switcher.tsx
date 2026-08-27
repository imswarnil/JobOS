"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Layers } from "lucide-react";

import {
  GROUPINGS,
  GROUPING_META,
  type Grouping,
} from "@/lib/journal/grouping";
import { cn } from "@/lib/utils";

/**
 * What the entries are divided by, across every view.
 *
 * Links, like the other switchers, so the choice is in the URL: "my Acme work
 * this year" is then an address rather than four clicks to reproduce.
 *
 * `kind` is the default and so writes no param, which keeps the common URL
 * short and means the board behaves exactly as it always did unless asked
 * otherwise.
 */
export function GroupSwitcher({ group }: { group: Grouping }) {
  const pathname = usePathname();
  const params = useSearchParams();

  function hrefFor(next: Grouping) {
    const p = new URLSearchParams(params);
    if (next === "kind") p.delete("group");
    else p.set("group", next);
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="flex items-center gap-1.5">
      <Layers
        className="h-3.5 w-3.5 shrink-0 text-fg-faint"
        strokeWidth={2}
        aria-hidden
      />
      <div
        className="inline-flex flex-wrap items-center gap-0.5 rounded-control border border-line bg-surface p-0.5"
        role="group"
        aria-label="Group entries by"
      >
        {GROUPINGS.map((id) => {
          const active = id === group;
          return (
            <Link
              key={id}
              href={hrefFor(id)}
              scroll={false}
              title={GROUPING_META[id].hint}
              aria-current={active ? "true" : undefined}
              className={cn(
                "fx-press flex h-8 items-center rounded-[6px] px-2.5 text-xs font-semibold",
                "transition-colors duration-200 ease-out",
                active
                  ? "bg-inverse text-fg-on-inverse"
                  : "text-fg-subtle hover:text-fg",
              )}
            >
              {GROUPING_META[id].label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
