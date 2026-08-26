"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Free-text search across title, body and impact.
 *
 * The query lives in the URL alongside the type filter, so a search is
 * shareable, bookmarkable and survives a reload — and the server does the
 * filtering, so it stays correct once there are more entries than one page.
 *
 * Debounced, because every keystroke would otherwise be a round trip.
 * `replace` rather than `push` so typing does not fill the back button with
 * one history entry per character.
 */
export function JournalSearch({ placeholder }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("q") ?? "";

  const [value, setValue] = React.useState(current);

  // Keep in step when the URL changes from somewhere else (a filter chip, the
  // back button). Adjusted during render rather than in an effect.
  const [syncedFrom, setSyncedFrom] = React.useState(current);
  if (syncedFrom !== current) {
    setSyncedFrom(current);
    setValue(current);
  }

  const commit = React.useCallback(
    (next: string) => {
      const params = new URLSearchParams(window.location.search);
      if (next.trim()) params.set("q", next.trim());
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  React.useEffect(() => {
    if (value === current) return;
    const timer = setTimeout(() => commit(value), 300);
    return () => clearTimeout(timer);
  }, [value, current, commit]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-fg-faint"
        strokeWidth={2}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? "Search your entries…"}
        aria-label="Search journal entries"
        className={cn(
          "h-10 w-full rounded-control border border-line bg-surface pr-9 pl-9",
          "text-sm text-fg placeholder:text-fg-faint",
          "transition-colors duration-200 ease-out hover:border-line-strong",
          "[&::-webkit-search-cancel-button]:hidden",
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            setValue("");
            commit("");
          }}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-control text-fg-faint hover:bg-sunken hover:text-fg"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
