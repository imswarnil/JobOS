"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/auth";
import { Brand } from "@/components/shell/brand";
import { PipelineMeter } from "@/components/shell/pipeline-meter";
import { UserMenu } from "@/components/shell/user-menu";
import { Badge } from "@/components/ui/badge";

/**
 * The rail.
 *
 * Grouped by what the sections are *for* rather than alphabetically — what you
 * did, what you send out, where it went — so the sidebar reads as a career
 * workflow rather than a list of screens. The primary action sits above the
 * nav because logging work is the one thing that must never be more than one
 * click away; everything else in JobOS is downstream of it.
 */
export function Sidebar({
  user,
  onNavigate,
  className,
}: {
  user: CurrentUser;
  /** Lets the mobile drawer close itself when a link is followed. */
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-line bg-rail",
        className,
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
        <Brand />
        <Badge tone="accent" title="Foundation & skeleton">
          Phase 0
        </Badge>
      </div>

      <div className="px-3 pb-4">
        <Link
          href="/journal"
          onClick={onNavigate}
          className={cn(
            "flex h-10 w-full items-center justify-center gap-2 rounded-control",
            "bg-accent text-sm font-semibold text-fg-on-accent shadow-e1",
            "transition-colors duration-200 ease-out hover:bg-accent-hover active:bg-accent-press",
          )}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Log today&rsquo;s work
        </Link>
      </div>

      <nav
        className="flex-1 space-y-5 overflow-y-auto px-3 pb-4"
        aria-label="Main"
      >
        {NAV.map((group) => (
          <div key={group.label}>
            <p className="t-slate px-2.5 pb-1.5">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={item.description}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-control py-2 pr-2.5 pl-3",
                        "text-[0.8125rem] font-medium",
                        "transition-colors duration-200 ease-out",
                        active
                          ? "bg-accent-soft text-accent-soft-fg"
                          : "text-fg-muted hover:bg-sunken hover:text-fg",
                      )}
                    >
                      {/* The record light again: a signal bar marking where
                          you are, echoing the dot in the brand. */}
                      <span
                        className={cn(
                          "absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-pill transition-opacity duration-200 ease-out",
                          active ? "bg-accent opacity-100" : "opacity-0",
                        )}
                      />
                      <Icon
                        className="h-4 w-4 shrink-0"
                        strokeWidth={active ? 2.25 : 1.75}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.phase ? (
                        <span
                          className={cn(
                            "t-num shrink-0 text-[0.625rem] font-bold tracking-wide",
                            active ? "text-accent-soft-fg/70" : "text-fg-faint",
                          )}
                          title={`Arrives in phase ${item.phase.slice(1)}`}
                        >
                          {item.phase}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-line-subtle">
        <PipelineMeter />
      </div>

      <div className="shrink-0 border-t border-line-subtle p-2">
        <UserMenu user={user} />
      </div>
    </div>
  );
}
