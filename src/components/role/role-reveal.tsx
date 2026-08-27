"use client";

import * as React from "react";
import {
  AlertCircle,
  Laugh,
  Quote,
  Sparkles,
  Target,
  TriangleAlert,
  Wand2,
} from "lucide-react";

import { defineRoleAction, type RoleState } from "@/lib/role/actions";
import type { RoleVerdict } from "@/lib/role/schema";
import { Badge } from "@/components/ui/badge";
import { Typewriter } from "@/components/role/typewriter";
import { cn } from "@/lib/utils";

/**
 * "What am I, actually?"
 *
 * The reveal is theatrical on purpose — the answer is the point of the
 * screen, and letting it land beats dumping a JSON blob into a card. But the
 * theatre is one typewriter on the title and staggered entrances underneath;
 * anything more and the second viewing becomes a wait.
 */
export function RoleReveal({
  quota,
  entryCount,
}: {
  quota: { remaining: number; limit: number };
  entryCount: number;
}) {
  const [state, formAction, pending] = React.useActionState<RoleState, FormData>(
    async () => defineRoleAction(),
    {},
  );

  const remaining = state.remaining ?? quota.remaining;
  const metered = Number.isFinite(quota.limit);
  const out = metered && remaining <= 0;

  if (state.verdict) {
    return <Verdict verdict={state.verdict} remaining={remaining} />;
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="fx-rise relative overflow-hidden rounded-card border border-line bg-surface px-6 py-12 text-center shadow-e1">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

        <div className="relative mx-auto max-w-lg space-y-4">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-control border border-line-accent/40 bg-accent-soft text-accent-soft-fg">
            <Wand2 className="h-5 w-5" strokeWidth={1.75} />
          </span>

          <h2 className="text-2xl font-bold tracking-[-0.03em] text-fg">
            What am I, actually?
          </h2>

          <p className="text-sm leading-relaxed text-fg-muted">
            Data engineer or analytics engineer? Backend or platform? The same
            work gets a different name at every company, and picking the wrong
            one means reading the wrong job ads. This reads your{" "}
            <strong className="font-semibold text-fg">
              {entryCount} {entryCount === 1 ? "entry" : "entries"}
            </strong>{" "}
            and tells you which word to put at the top of your resume — using
            only what you actually wrote down.
          </p>

          <button
            type="submit"
            disabled={pending || out}
            className={cn(
              "fx-press mx-auto inline-flex h-11 items-center gap-2 rounded-control px-5",
              "text-sm font-semibold shadow-e1 transition-colors duration-200 ease-out",
              "disabled:pointer-events-none disabled:opacity-60",
              "bg-accent text-fg-on-accent hover:bg-accent-hover active:bg-accent-press",
            )}
          >
            {pending ? (
              <>
                <Sparkles className="h-4 w-4 animate-pulse" strokeWidth={2.25} />
                Reading your journal…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" strokeWidth={2.25} />
                Define my role
              </>
            )}
          </button>

          <p className="text-xs text-fg-subtle">
            {!metered ? (
              "Self-hosted model — no request limit"
            ) : out ? (
              "You have used all your requests for now."
            ) : (
              <>
                {remaining} of {quota.limit} model requests left today
              </>
            )}
          </p>
        </div>
      </div>

      {state.error ? (
        <p
          role="alert"
          className={cn(
            "fx-fade flex items-start gap-2.5 rounded-control border px-3.5 py-3 text-xs leading-relaxed",
            state.rateLimited
              ? "border-warning-line/40 bg-warning-bg text-warning-fg"
              : "border-danger-line/40 bg-danger-bg text-danger-fg",
          )}
        >
          {state.rateLimited ? (
            <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          ) : (
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          )}
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function Verdict({
  verdict,
  remaining,
}: {
  verdict: RoleVerdict;
  remaining: number;
}) {
  const tone =
    verdict.confidence === "high"
      ? "success"
      : verdict.confidence === "medium"
        ? "craft"
        : "neutral";

  return (
    <div className="space-y-4">
      {/* ── The answer ───────────────────────────────────────────────── */}
      <div className="fx-rise relative overflow-hidden rounded-card border border-line-accent/40 bg-surface px-6 py-10 text-center shadow-e2">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />

        <div className="relative space-y-3">
          <p className="t-slate">You are a</p>

          <h2 className="text-3xl leading-tight font-bold tracking-[-0.035em] text-fg sm:text-4xl">
            <Typewriter text={verdict.title} speed={45} />
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge tone={tone}>{verdict.confidence} confidence</Badge>
            {verdict.alsoCalled.slice(0, 3).map((t) => (
              <Badge key={t}>also: {t}</Badge>
            ))}
          </div>

          <p className="mx-auto max-w-[52ch] text-sm leading-relaxed text-fg-muted">
            <Typewriter
              text={verdict.reasoning}
              speed={12}
              startDelay={verdict.title.length * 45 + 250}
              caret={false}
            />
          </p>
        </div>
      </div>

      <div className="fx-stagger grid gap-4 lg:grid-cols-2">
        {/* ── The party line ─────────────────────────────────────────── */}
        <Card
          style={{ "--i": 0 } as React.CSSProperties}
          icon={Target}
          title="What you tell your mum"
          tone="accent"
        >
          <p className="text-[0.9375rem] leading-relaxed text-fg italic">
            &ldquo;{verdict.explainToMum}&rdquo;
          </p>
        </Card>

        {/* ── The jokes ──────────────────────────────────────────────── */}
        <Card
          style={{ "--i": 1 } as React.CSSProperties}
          icon={Laugh}
          title="Or, less helpfully"
        >
          <ul className="space-y-2.5">
            {verdict.jokes.map((joke, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-sm leading-relaxed text-fg-muted"
              >
                <span className="text-fg-faint select-none">—</span>
                {joke}
              </li>
            ))}
          </ul>
        </Card>

        {/* ── The confusion ──────────────────────────────────────────── */}
        {verdict.notQuite.length ? (
          <Card
            style={{ "--i": 2 } as React.CSSProperties}
            icon={TriangleAlert}
            title="What you are not (yet)"
          >
            <ul className="space-y-3">
              {verdict.notQuite.map((n) => (
                <li key={n.title}>
                  <p className="text-[0.8125rem] font-semibold text-fg">
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                    {n.why}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {/* ── The grounding ──────────────────────────────────────────── */}
        {verdict.evidence.length ? (
          <Card
            style={{ "--i": 3 } as React.CSSProperties}
            icon={Quote}
            title="Because you wrote"
          >
            <ul className="space-y-2">
              {verdict.evidence.map((e, i) => (
                <li
                  key={i}
                  className="border-l-2 border-line pl-3 text-xs leading-relaxed text-fg-muted"
                >
                  {e}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>

      {verdict.strengths.length ? (
        <div className="fx-rise rounded-card border border-line bg-surface p-5 shadow-e1">
          <p className="t-slate mb-3">Backed by the record</p>
          <ul className="flex flex-wrap gap-1.5">
            {verdict.strengths.map((s) => (
              <li
                key={s}
                className="rounded-pill border border-line bg-sunken px-2.5 py-1 text-xs font-medium text-fg-muted"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {verdict.gaps.length ? (
        <div className="fx-fade rounded-control border border-info-line/30 bg-info-bg px-4 py-3">
          <p className="text-xs font-semibold text-info-fg">
            To sharpen this, log more about:
          </p>
          <ul className="mt-1.5 space-y-1">
            {verdict.gaps.map((g, i) => (
              <li key={i} className="text-xs leading-relaxed text-info-fg">
                · {g}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-center text-xs text-fg-subtle">
        {Number.isFinite(remaining)
          ? `${remaining} model ${remaining === 1 ? "request" : "requests"} left today. `
          : ""}
        Reload to run it again.
      </p>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  tone,
  style,
  children,
}: {
  icon: React.ElementType;
  title: string;
  tone?: "accent";
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <section
      style={style}
      className={cn(
        "rounded-card border bg-surface p-5 shadow-e1",
        tone === "accent" ? "border-line-accent/40" : "border-line",
      )}
    >
      <p className="t-slate mb-3 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {title}
      </p>
      {children}
    </section>
  );
}
