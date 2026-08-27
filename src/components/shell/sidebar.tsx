"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";

import { NAV } from "@/lib/nav";
import { PHASES } from "@/lib/phases";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/auth";
import { Brand, SignalDot } from "@/components/shell/brand";
import { PipelineMeter } from "@/components/shell/pipeline-meter";
import { UserMenu } from "@/components/shell/user-menu";
import { Badge } from "@/components/ui/badge";

/**
 * The rail.
 *
 * Grouped by what the sections are *for* rather than alphabetically — what you
 * did, what you send out, where it went — so it reads as a career workflow
 * rather than a list of screens. The primary action sits above the nav because
 * logging work must never be more than one click away; everything else in
 * JobOS is downstream of it.
 *
 * Collapsed, it keeps only the icons. Labels are removed from the accessible
 * tree rather than hidden with opacity, so a screen reader is not left
 * announcing invisible text — the `title` and `aria-label` carry the name.
 */
export function Sidebar({
  user,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  className,
}: {
  user: CurrentUser;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Lets the mobile drawer close itself when a link is followed. */
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const currentPhase = PHASES.find((p) => p.status === "building");

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-line bg-rail",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-2",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        {collapsed ? (
          <Link
            href="/dashboard"
            aria-label="JobOS — dashboard"
            title="JobOS"
            className="grid h-9 w-9 place-items-center rounded-control hover:bg-sunken"
          >
            <SignalDot />
          </Link>
        ) : (
          <>
            <Brand />
            {currentPhase ? (
              <Badge tone="accent" title={currentPhase.title}>
                Phase {currentPhase.id.slice(1)}
              </Badge>
            ) : null}
          </>
        )}
      </div>

      <div className={cn("pb-4", collapsed ? "px-2" : "px-3")}>
        <Link
          href="/journal?compose=1"
          onClick={onNavigate}
          title="Log today's work"
          aria-label="Log today's work"
          className={cn(
            "fx-tap bg-heat flex h-10 items-center justify-center gap-2 rounded-control",
            "text-sm font-semibold text-fg-on-accent shadow-e2",
            collapsed ? "w-9 px-0" : "w-full",
          )}
        >
          <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          {!collapsed && <span>Log today&rsquo;s work</span>}
        </Link>
      </div>

      <nav
        className={cn(
          "flex-1 space-y-5 overflow-y-auto pb-4",
          collapsed ? "px-2" : "px-3",
        )}
        aria-label="Main"
      >
        {NAV.map((group) => (
          <div key={group.label}>
            {collapsed ? (
              <div className="mx-2 mb-2 h-px bg-line-subtle" aria-hidden />
            ) : (
              <p className="t-slate px-2.5 pb-1.5">{group.label}</p>
            )}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      title={collapsed ? item.label : item.description}
                      className={cn(
                        "group relative flex items-center rounded-control text-[0.8125rem] font-semibold",
                        "transition-[color,background-color,transform] duration-(--animate-duration-1) ease-(--ease-spring)",
                        "hover:translate-x-0.5",
                        collapsed
                          ? "h-9 w-9 justify-center"
                          : "gap-2.5 py-2 pr-2.5 pl-3",
                        active
                          ? "bg-accent-soft text-accent-soft-fg"
                          : "text-fg-muted hover:bg-sunken hover:text-fg",
                      )}
                    >
                      {/* The record light: a signal bar marking where you are,
                          echoing the dot in the brand. */}
                      {!collapsed && (
                        <span
                          className={cn(
                            "absolute top-1/2 left-0 -translate-y-1/2 rounded-pill bg-accent",
                            "transition-[height,opacity] duration-(--animate-duration-2) ease-(--ease-bounce)",
                            active ? "h-4 w-0.5 opacity-100" : "h-0 w-0.5 opacity-0",
                          )}
                        />
                      )}
                      <Icon
                        className="h-4 w-4 shrink-0"
                        strokeWidth={active ? 2.25 : 1.75}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.phase ? (
                            <span
                              className={cn(
                                "t-num shrink-0 text-[0.625rem] font-bold tracking-wide",
                                active
                                  ? "text-accent-soft-fg/70"
                                  : "text-fg-faint",
                              )}
                              title={`Arrives in phase ${item.phase.slice(1)}`}
                            >
                              {item.phase}
                            </span>
                          ) : null}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="shrink-0 border-t border-line-subtle">
          <PipelineMeter />
        </div>
      )}

      <div className="shrink-0 border-t border-line-subtle p-2">
        <UserMenu user={user} collapsed={collapsed} />
      </div>

      {/* Desktop only — on mobile the drawer closes instead of collapsing. */}
      {onToggleCollapse ? (
        <div
          className={cn(
            "hidden shrink-0 border-t border-line-subtle p-2 lg:block",
            collapsed && "flex justify-center",
          )}
        >
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={`${collapsed ? "Expand" : "Collapse"} sidebar  ·  [`}
            className={cn(
              "flex h-8 items-center gap-2 rounded-control text-fg-faint",
              "transition-colors duration-200 ease-out hover:bg-sunken hover:text-fg",
              collapsed ? "w-9 justify-center" : "w-full px-2.5",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
                <span className="text-xs font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
