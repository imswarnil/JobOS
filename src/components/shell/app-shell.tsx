"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

/**
 * Holds the one piece of state the shell needs — whether the mobile drawer is
 * open — and nothing else. `children` arrives as a prop from the server
 * layout, so marking this "use client" does not drag the page content across
 * the boundary with it.
 */
export function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = React.useState(false);
  const pathname = usePathname();

  // Following a link on mobile should close the drawer behind you. Adjusted
  // during render rather than in an effect: the drawer must already be closed
  // in the same commit that paints the new route, or it flashes open over it.
  const [renderedPath, setRenderedPath] = React.useState(pathname);
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    setNavOpen(false);
  }

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex min-h-svh">
      {/* Desktop rail — always present, never animated. */}
      <aside className="fixed inset-y-0 left-0 hidden w-rail lg:block">
        <Sidebar user={user} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          navOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!navOpen}
      >
        <div
          onClick={() => setNavOpen(false)}
          className={cn(
            "absolute inset-0 bg-(--bg-scrim) transition-opacity duration-300 ease-out",
            navOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-rail max-w-[85vw] shadow-e4",
            "transition-transform duration-300 ease-out",
            navOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar user={user} onNavigate={() => setNavOpen(false)} />
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
            className="absolute top-4 -right-11 grid h-9 w-9 place-items-center rounded-control bg-surface text-fg-muted shadow-e2"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-(--container-rail)">
        <Topbar onOpenNav={() => setNavOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
