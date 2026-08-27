"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";

import { activeItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shell/theme-toggle";

/**
 * Thin by design. The sidebar carries identity and navigation, so the topbar
 * only has to say where you are and offer the two things that must be
 * reachable from every screen: search and the theme.
 */
export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const pathname = usePathname();
  const current = activeItem(pathname);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 px-4 sm:px-6",
        "border-b border-line bg-canvas/85 backdrop-blur-md",
      )}
    >
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="fx-tap grid h-9 w-9 shrink-0 place-items-center rounded-control text-fg-muted transition-colors duration-(--animate-duration-1) ease-out hover:bg-sunken hover:text-fg lg:hidden"
      >
        <Menu className="h-4.5 w-4.5" strokeWidth={1.75} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold text-fg">
          {current?.label ?? "JobOS"}
        </h1>
        <p className="hidden truncate text-xs text-fg-subtle sm:block">
          {current?.description ?? "Career operating system"}
        </p>
      </div>

      {/* Sends you to the journal, where the real search lives. A command
          palette spanning jobs and applications belongs to Phase 4, when
          there is something else to search.
          TODO(Phase 4): promote to a ⌘K palette across all record types. */}
      <Link
        href="/journal"
        className={cn(
          "fx-tap hidden h-9 items-center gap-2 rounded-control border border-line bg-surface px-3 md:flex",
          "text-xs text-fg-faint transition-colors duration-(--animate-duration-1) ease-out hover:border-line-strong hover:text-fg-muted",
        )}
      >
        <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
        <span>Search entries</span>
      </Link>

      <ThemeToggle />
    </header>
  );
}
