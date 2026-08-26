"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { LOG_TYPES } from "@/lib/journal/types";
import { cn } from "@/lib/utils";

/**
 * Filter chips carrying counts.
 *
 * Links rather than click handlers, so the filtered view has a real URL —
 * shareable, bookmarkable, and it survives a reload. A count of zero still
 * renders: knowing you have never logged a "win" is itself information.
 */
export function TypeFilter({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get("type");

  function hrefFor(type: string | null) {
    const next = new URLSearchParams(params);
    if (type) next.set("type", type);
    else next.delete("type");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by kind">
      <Chip href={hrefFor(null)} active={!active} label="All" count={total} />
      {LOG_TYPES.map((t) => {
        const Icon = t.icon;
        return (
          <Chip
            key={t.id}
            href={hrefFor(t.id)}
            active={active === t.id}
            label={t.label}
            count={counts[t.id] ?? 0}
            icon={<Icon className="h-3.5 w-3.5" strokeWidth={2} />}
            title={t.blurb}
          />
        );
      })}
    </div>
  );
}

function Chip({
  href,
  active,
  label,
  count,
  icon,
  title,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  icon?: React.ReactNode;
  title?: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      title={title}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-semibold",
        "transition-colors duration-200 ease-out",
        active
          ? "border-line-accent bg-accent text-fg-on-accent"
          : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg",
        count === 0 && !active && "opacity-55",
      )}
    >
      {icon}
      {label}
      <span className={cn("t-num", active ? "opacity-80" : "text-fg-faint")}>
        {count}
      </span>
    </Link>
  );
}
