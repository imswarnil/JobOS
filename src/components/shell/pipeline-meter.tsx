import { cn } from "@/lib/utils";

/**
 * The sidebar's reason to exist beyond navigation: a glance at whether the
 * search is actually moving.
 *
 * Kept to three short rows on purpose — the rail has to hold seven nav items,
 * a primary action and the user menu on a laptop screen, and anything taller
 * here pushes the bottom of the nav out of view.
 *
 * TODO(Phase 4): read real stage counts from `application`, scoped by owner.
 */
const STAGES = [
  { key: "applied", label: "Applied", count: 0, bar: "bg-fg-faint" },
  { key: "interview", label: "Interview", count: 0, bar: "bg-craft" },
  { key: "offer", label: "Offer", count: 0, bar: "bg-success-line" },
] as const;

export function PipelineMeter({ className }: { className?: string }) {
  const total = STAGES.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className={cn("px-3 py-3", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="t-slate">Pipeline</span>
        <span className="t-num text-[0.625rem] font-semibold text-fg-subtle">
          {total} active
        </span>
      </div>

      {/* Empty state is a flat rule rather than an empty bar — a zero-width
          stacked bar reads as broken, a rule reads as "nothing yet". */}
      <div className="flex h-1 gap-0.5 overflow-hidden rounded-pill bg-sunken">
        {total > 0 &&
          STAGES.map((s) =>
            s.count ? (
              <div
                key={s.key}
                className={cn("h-full", s.bar)}
                style={{ flex: s.count }}
              />
            ) : null,
          )}
      </div>

      <dl className="mt-2 flex items-center justify-between gap-1">
        {STAGES.map((s) => (
          <div key={s.key} className="flex min-w-0 items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-pill", s.bar)} />
            <dt className="sr-only">{s.label}</dt>
            <dd
              className="t-num truncate text-[0.6875rem] text-fg-subtle"
              title={s.label}
            >
              <span className="font-semibold text-fg-muted">{s.count}</span>{" "}
              {s.label}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
