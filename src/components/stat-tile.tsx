import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A single number with its label and a one-line reading of what it means.
 * Every value in Phase 0 is a zero — an honest empty state rather than fake
 * demo data, which would make the dashboard impossible to trust later.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ElementType;
  tone?: "neutral" | "accent" | "craft" | "zest";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fx-lift rounded-card border border-line bg-surface p-4 shadow-e1 sm:p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="t-slate truncate">{label}</p>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            tone === "accent"
              ? "text-accent"
              : tone === "craft"
                ? "text-craft"
                : tone === "zest"
                  ? "text-zest"
                  : "text-fg-faint",
          )}
          strokeWidth={1.75}
        />
      </div>
      <p
        className={cn(
          "t-num mt-3 text-[2rem] leading-none font-extrabold tracking-[-0.04em]",
          // The number is the point of the tile, so it is the one thing
          // allowed to carry the gradient — and only on the tile that matters.
          tone === "accent" ? "t-gradient" : "text-fg",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
