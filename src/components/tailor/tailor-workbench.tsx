"use client";

import * as React from "react";
import {
  AlertCircle,
  Check,
  ClipboardPaste,
  Link2,
  Loader2,
  Save,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { saveTailoredAction, tailorAction, type TailorState } from "@/lib/tailor/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Paste a posting, get a rewrite you can actually check.
 *
 * The output is presented for *review*, not for acceptance: the rationale,
 * the gaps and the grounding warnings are as prominent as the rewritten
 * bullets, because the person saving this is the one who has to defend every
 * line of it in a room.
 */
export function TailorWorkbench({
  quota,
  hasResume,
}: {
  quota: { remaining: number; limit: number };
  hasResume: boolean;
}) {
  const [mode, setMode] = React.useState<"paste" | "url">("paste");

  const [state, formAction, pending] = React.useActionState<TailorState, FormData>(
    tailorAction,
    {},
  );

  const metered = Number.isFinite(quota.limit);
  const remaining = state.remaining ?? quota.remaining;
  const out = metered && remaining <= 0;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="rounded-card border border-line bg-surface p-5 shadow-e1">
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {(
              [
                ["paste", "Paste the text", ClipboardPaste],
                ["url", "From a link", Link2],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                aria-pressed={mode === id}
                className={cn(
                  "fx-press flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-semibold",
                  "transition-colors duration-200 ease-out",
                  mode === id
                    ? "border-line-accent bg-accent text-fg-on-accent"
                    : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg",
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                {label}
              </button>
            ))}
          </div>

          {mode === "paste" ? (
            <Field label="The job posting" htmlFor="description">
              <textarea
                id="description"
                name="description"
                rows={10}
                placeholder="Paste the whole thing — responsibilities and requirements included. The more of it there is, the less the model has to guess."
                className="w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed text-fg placeholder:text-fg-faint hover:border-line-strong"
              />
            </Field>
          ) : (
            <Field
              label="Link to the posting"
              htmlFor="url"
              hint="One page, fetched when you click"
            >
              <Input
                id="url"
                name="url"
                type="url"
                placeholder="https://…"
              />
            </Field>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-fg-subtle">
              {!hasResume
                ? "Add some resume entries first — tailoring rearranges what you have."
                : !metered
                  ? "Self-hosted model — no request limit."
                  : `${remaining} of ${quota.limit} model requests left today.`}
            </p>

            <Button
              type="submit"
              variant="primary"
              disabled={pending || out || !hasResume}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
              ) : (
                <Sparkles className="h-4 w-4" strokeWidth={2.25} />
              )}
              {pending ? "Reading the posting…" : "Tailor my resume"}
            </Button>
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
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            {state.error}
          </p>
        ) : null}
      </form>

      {state.result ? (
        <Result state={state} />
      ) : null}
    </div>
  );
}

function Result({ state }: { state: TailorState }) {
  const { posting, result, issues = [], provider } = state;
  if (!result) return null;

  return (
    <div className="fx-rise space-y-4">
      {/* ── Fit ─────────────────────────────────────────────────────────── */}
      <div className="rounded-card border border-line bg-surface p-5 shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="t-slate">Tailored for</p>
            <h2 className="mt-1 text-lg font-semibold text-fg">
              {posting?.title}
              {posting?.company ? (
                <span className="font-normal text-fg-muted"> · {posting.company}</span>
              ) : null}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {provider ? <Badge>{provider}</Badge> : null}
            <div className="text-right">
              <p className="t-num text-2xl font-bold tracking-[-0.03em] text-fg">
                {result.matchScore}
                <span className="text-sm font-normal text-fg-faint">/100</span>
              </p>
              <p className="t-slate">match</p>
            </div>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-sunken">
          <div
            className={cn(
              "h-full rounded-pill transition-[width] duration-500 ease-out",
              result.matchScore >= 70
                ? "bg-success-line"
                : result.matchScore >= 40
                  ? "bg-craft"
                  : "bg-danger-line",
            )}
            style={{ width: `${result.matchScore}%` }}
          />
        </div>
      </div>

      {/* ── Grounding warnings — first, because they matter most ────────── */}
      {issues.length ? (
        <div className="rounded-card border border-warning-line/40 bg-warning-bg p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-warning-fg">
            <TriangleAlert className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            {issues.length} {issues.length === 1 ? "number" : "numbers"} not in your
            record
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-warning-fg">
            These figures appear in the rewrite but nowhere in your resume or
            journal. They may be a restatement the check could not match — but
            check each one before you send it, because you will have to defend
            it out loud.
          </p>
          <ul className="mt-3 space-y-2">
            {issues.map((issue, i) => (
              <li key={i} className="rounded-control bg-canvas/50 px-3 py-2">
                <p className="text-xs font-semibold text-warning-fg">
                  {issue.section} · {issue.item} —{" "}
                  <span className="t-num">{issue.unsupported.join(", ")}</span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                  {issue.bullet}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-control border border-success-line/30 bg-success-bg px-3.5 py-2.5 text-xs text-success-fg">
          <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
          Every number in the rewrite traces back to something you wrote.
        </p>
      )}

      {/* ── Gaps ───────────────────────────────────────────────────────── */}
      {result.gaps.length ? (
        <div className="rounded-card border border-line bg-surface p-5 shadow-e1">
          <p className="t-slate mb-3">What this posting wants that you cannot show</p>
          <ul className="space-y-3">
            {result.gaps.map((gap, i) => (
              <li key={i}>
                <p className="text-[0.8125rem] font-semibold text-fg">
                  {gap.requirement}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                  {gap.why}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── What changed ───────────────────────────────────────────────── */}
      {result.rationale.length ? (
        <div className="rounded-card border border-line bg-surface p-5 shadow-e1">
          <p className="t-slate mb-3">What changed</p>
          <ul className="space-y-1.5">
            {result.rationale.map((line, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm leading-relaxed text-fg-muted"
              >
                <span className="text-fg-faint select-none">—</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── The rewrite ────────────────────────────────────────────────── */}
      <div className="rounded-card border border-line bg-surface shadow-e1">
        <div className="border-b border-line-subtle px-5 py-3">
          <p className="text-sm font-semibold text-fg">The rewrite</p>
          {result.headline ? (
            <p className="mt-0.5 text-xs text-fg-muted">
              Headline: {result.headline}
            </p>
          ) : null}
        </div>

        <div className="space-y-5 p-5">
          {result.summary ? (
            <div>
              <p className="t-slate mb-1.5">Summary</p>
              <p className="text-sm leading-relaxed text-fg-muted">
                {result.summary}
              </p>
            </div>
          ) : null}

          {result.sections.map((section) => (
            <div key={section.id}>
              <p className="t-slate mb-2">{section.title}</p>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-control border border-line-subtle px-3 py-2.5"
                  >
                    <p className="text-[0.8125rem] font-semibold text-fg">
                      {item.title}
                      {item.subtitle ? (
                        <span className="font-normal text-fg-muted">
                          {" "}
                          — {item.subtitle}
                        </span>
                      ) : null}
                    </p>
                    {item.bullets.length ? (
                      <ul className="mt-1.5 list-disc space-y-1 pl-4">
                        {item.bullets.map((b, i) => (
                          <li
                            key={i}
                            className="text-xs leading-relaxed text-fg-muted"
                          >
                            {b}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {item.tags.length ? (
                      <p className="mt-1.5 text-[0.6875rem] text-fg-faint">
                        {item.tags.join(", ")}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <SaveVersion result={result} posting={posting?.title} company={posting?.company} />
      </div>
    </div>
  );
}

function SaveVersion({
  result,
  posting,
  company,
}: {
  result: NonNullable<TailorState["result"]>;
  posting?: string;
  company?: string;
}) {
  const [state, formAction, pending] = React.useActionState<
    { error?: string; ok?: boolean },
    FormData
  >(saveTailoredAction, {});

  const suggested = [posting, company].filter(Boolean).join(" · ") || "Tailored";

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-2 border-t border-line-subtle px-5 py-4"
    >
      <input type="hidden" name="payload" value={JSON.stringify(result)} />
      <Input
        name="label"
        defaultValue={suggested}
        maxLength={120}
        aria-label="Version name"
        className="min-w-0 flex-1"
      />
      <Button type="submit" variant="primary" disabled={pending || state.ok}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
        ) : state.ok ? (
          <Check className="h-4 w-4" strokeWidth={2.5} />
        ) : (
          <Save className="h-4 w-4" strokeWidth={1.75} />
        )}
        {state.ok ? "Saved as a version" : "Save as a version"}
      </Button>
      {state.error ? (
        <p role="alert" className="w-full text-xs text-danger-fg">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
