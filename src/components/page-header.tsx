import * as React from "react";
import { cn } from "@/lib/utils";

/** The heading block every screen opens with. */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 pb-6 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow ? <div className="flex items-center gap-2">{eyebrow}</div> : null}
        <h2 className="text-2xl font-bold tracking-[-0.025em] text-fg sm:text-[1.75rem]">
          {title}
        </h2>
        {description ? (
          <p className="max-w-[56ch] text-sm leading-relaxed text-fg-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
