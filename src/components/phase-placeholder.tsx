import * as React from "react";
import { Check, Circle } from "lucide-react";

import { PHASE_BY_ID, type PhaseId } from "@/lib/phases";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

/**
 * The screen every unbuilt route renders.
 *
 * It shows the phase that will make it real and what that phase delivers, so
 * a placeholder is a statement of intent rather than a dead end. The content
 * comes from lib/phases.ts — shipping a phase updates every one of these at
 * once.
 */
export function PhasePlaceholder({
  title,
  description,
  phase,
  icon: Icon,
  preview,
}: {
  title: string;
  description: string;
  phase: PhaseId;
  icon: React.ElementType;
  /** Optional bespoke content shown above the deliverables list. */
  preview?: React.ReactNode;
}) {
  const info = PHASE_BY_ID[phase];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title={title}
        description={description}
        eyebrow={
          <Badge tone={info.status === "building" ? "accent" : "neutral"}>
            Coming in Phase {phase.slice(1)}
          </Badge>
        }
      />

      {preview}

      <Card className="relative overflow-hidden">
        {/* The engineering grid: this screen is scaffolding, and it says so. */}
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />

        <div className="relative p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-control border border-line bg-surface text-fg-muted shadow-e1">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="t-slate">Phase {phase.slice(1)}</p>
              <h3 className="text-lg font-semibold text-fg">{info.title}</h3>
              <p className="max-w-[60ch] text-sm leading-relaxed text-fg-muted">
                {info.summary}
              </p>
            </div>
          </div>

          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {info.deliverables.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 rounded-control border border-line-subtle bg-surface/70 px-3 py-2.5"
              >
                {info.status === "shipped" ? (
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-fg"
                    strokeWidth={2.5}
                  />
                ) : (
                  <Circle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-faint"
                    strokeWidth={1.75}
                  />
                )}
                <span className="text-[0.8125rem] leading-snug text-fg-muted">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
