"use client";

import * as React from "react";
import { AlertTriangle, Cpu, Sparkles, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * THE SHARED FURNITURE OF AN AI PANEL
 * ===================================
 *
 * Four operations, one appearance. That consistency is doing real work: the
 * single most important thing these panels communicate is "a model wrote
 * this, check it", and a warning that looks different in four places stops
 * being read in all four.
 *
 * So: zest edge, zest badge, the provider named at the bottom, and any
 * unverifiable number called out in the same yellow every time.
 */

/**
 * The working state.
 *
 * Not a spinner. A spinner is a promise that this will be quick, and a 4B
 * model on a laptop takes four to fifteen seconds — long enough that a
 * spinning circle starts reading as a hang. A drifting gradient with a line
 * of text saying what is happening survives that wait without lying about it.
 */
export function Working({ label }: { label: string }) {
  return (
    <div
      className="fx-working flex items-center gap-2.5 rounded-control border border-zest-line/40 px-3 py-3"
      role="status"
      aria-live="polite"
    >
      <Sparkles className="h-4 w-4 shrink-0 text-zest" strokeWidth={2.25} />
      <p className="text-[0.8125rem] font-medium text-fg">{label}</p>
      <span className="ml-auto text-xs text-fg-subtle">
        Local models take a moment.
      </span>
    </div>
  );
}

/** An error from the chain. Wiggles once so a repeat failure is noticeable. */
export function Failure({ message }: { message: string }) {
  return (
    <p
      key={message}
      role="alert"
      className="fx-wiggle flex items-start gap-2 rounded-control border border-danger-line/40 bg-danger-bg px-3 py-2.5 text-xs leading-relaxed text-danger-fg"
    >
      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      {message}
    </p>
  );
}

/**
 * Numbers in generated text that no source vouches for.
 *
 * Shown rather than silently stripped, because the model is sometimes right —
 * it may have restated "three hours to eighteen minutes" as "3h → 18m", which
 * the checker cannot match but a person recognises instantly. The person who
 * has to say this out loud in an interview is the right one to decide.
 */
export function Unverified({ tokens }: { tokens: string[] }) {
  if (!tokens.length) return null;

  return (
    <p className="mt-1.5 flex items-start gap-1.5 rounded-control border border-warning-line/40 bg-warning-bg px-2 py-1.5 text-[0.6875rem] leading-relaxed text-warning-fg">
      <TriangleAlert className="mt-px h-3 w-3 shrink-0" strokeWidth={2.25} />
      <span>
        <strong className="font-semibold">
          {tokens.map((t) => `“${t}”`).join(", ")}
        </strong>{" "}
        {tokens.length === 1 ? "appears" : "appear"} nowhere in your journal or
        resume. Check it before you use this.
      </span>
    </p>
  );
}

/** Which model answered, and what is left of the quota. */
export function Attribution({
  provider,
  remaining,
}: {
  provider?: string;
  remaining?: number;
}) {
  if (!provider) return null;

  const local = provider === "anythingllm" || provider === "ollama";

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-[0.6875rem] text-fg-faint">
      <Cpu className="h-3 w-3" strokeWidth={2} />
      <span>
        Written by <strong className="font-semibold">{provider}</strong>
        {local ? " — on your own hardware." : " — a hosted model."}
      </span>
      {remaining !== undefined && Number.isFinite(remaining) ? (
        <span>{remaining} requests left today.</span>
      ) : null}
    </p>
  );
}

/** The header every AI panel wears, so they are recognisable as a family. */
export function AiHeading({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="zest">
        <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} />
        Generated
      </Badge>
      <p className="text-[0.8125rem] font-semibold text-fg">{title}</p>
      {hint ? <span className="text-xs text-fg-subtle">{hint}</span> : null}
      {children ? <span className="ml-auto">{children}</span> : null}
    </div>
  );
}

/** A card of generated content: zest edge, cascade entrance. */
export function AiPanel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "edge-spark fx-bounce relative overflow-hidden rounded-card border border-zest-line/40 bg-zest-soft/30 p-3.5",
        className,
      )}
    >
      {children}
    </div>
  );
}
