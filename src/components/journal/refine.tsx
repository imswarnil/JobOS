"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * SEARCH AND GROUPING, OUT OF THE WAY UNTIL ASKED FOR
 * ==================================================
 *
 * The journal used to open with a page header, a composer, a search box, six
 * type chips, a view switcher and a group-by row — seven controls between you
 * and your first entry. Every one is useful occasionally and none is useful
 * on the visit where you just want to read what you wrote.
 *
 * So the two you reach for least live behind one button. The type chips and
 * the view switcher stay out, because those are what you actually change.
 *
 * It opens automatically when a filter is already applied — arriving from a
 * link with a search term active and no visible search box would be a UI
 * lying about its own state.
 */
export function Refine({
  active,
  children,
}: {
  /** True when a search or non-default grouping is already in effect. */
  active: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(active);

  // A filter applied from elsewhere must reveal its controls. Adjusted during
  // render rather than in an effect so the panel is open in the same commit
  // that paints the filtered list.
  const [seen, setSeen] = React.useState(active);
  if (seen !== active) {
    setSeen(active);
    if (active) setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={cn(
          "fx-tap inline-flex h-9 items-center gap-2 rounded-control border px-3 text-xs font-semibold",
          "transition-colors duration-(--animate-duration-1) ease-out",
          open || active
            ? "border-line-accent bg-accent-soft text-accent-soft-fg"
            : "border-line bg-surface text-fg-muted hover:bg-sunken",
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2.25} />
        <span className="hidden sm:inline">Search &amp; group</span>
      </button>

      {open ? (
        <div className="fx-bounce w-full space-y-3 rounded-card border border-line-subtle bg-sunken p-3">
          {children}
        </div>
      ) : null}
    </>
  );
}
