"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronsUpDown, LogOut, Settings, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/auth";
import { signOutAction } from "@/lib/auth/actions";

/**
 * A plain popover rather than a headless-UI dependency — the shell needs one
 * menu, and one menu is not worth a component library.
 */
export function UserMenu({
  user,
  collapsed = false,
}: {
  user: CurrentUser;
  /** Collapsed shows the avatar alone; the menu still opens. */
  collapsed?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const items = [
    { label: "Profile", href: "/settings", icon: User },
    { label: "Settings", href: "/settings", icon: Settings },
    { label: "Admin", href: "/admin", icon: ShieldCheck },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={collapsed ? `Account: ${user.name}` : undefined}
        title={collapsed ? user.name : undefined}
        className={cn(
          "flex items-center rounded-control text-left",
          "transition-colors duration-200 ease-out hover:bg-sunken",
          collapsed ? "w-full justify-center p-1.5" : "w-full gap-2.5 p-2",
          open && "bg-sunken",
        )}
      >
        <Avatar user={user} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-semibold text-fg">
                {user.name}
              </span>
              <span className="block truncate text-[0.6875rem] text-fg-subtle">
                {user.email}
              </span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-fg-faint" />
          </>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "fx-pop absolute bottom-[calc(100%+0.5rem)] left-0 z-50 min-w-56",
            collapsed ? "w-56" : "w-full",
            "rounded-card border border-line bg-raised p-1.5 shadow-e3",
          )}
        >
          {items.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-control px-2.5 py-2 text-[0.8125rem] text-fg-muted transition-colors duration-200 ease-out hover:bg-sunken hover:text-fg"
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {label}
            </Link>
          ))}
          <div className="my-1.5 h-px bg-line-subtle" />
          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-[0.8125rem] text-danger-fg transition-colors duration-200 ease-out hover:bg-danger-bg"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function Avatar({
  user,
  className,
}: {
  user: CurrentUser;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-control",
        "bg-inverse text-[0.6875rem] font-bold tracking-wide text-fg-on-inverse",
        className,
      )}
      aria-hidden
    >
      {user.initials}
    </span>
  );
}
