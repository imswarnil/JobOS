"use client";

import * as React from "react";
import {
  ChevronDown,
  Eye,
  FileWarning,
  Gauge,
  Lightbulb,
  Sparkles,
  ThumbsUp,
  Zap,
} from "lucide-react";

import { lintResume, type Finding, type Severity } from "@/lib/resume/lint";
import type { ResumeData } from "@/lib/resume/schema";
import { reviewResumeAction, type ReviewState } from "@/lib/resume/ai-actions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AiHeading,
  Attribution,
  Failure,
  Working,
} from "@/components/resume/ai-shell";

/**
 * THE DOCTOR
 * ==========
 *
 * Two halves, deliberately unequal.
 *
 * The top half is `lintResume` — pure, instant, free, and running on every
 * render. It answers everything a regex can: missing contact details, bullets
 * that open with "Responsible for", a role with eleven bullets, a section
 * heading over nothing. No button, no wait, no quota. Most of what is wrong
 * with most resumes is in this list.
 *
 * The bottom half costs a model call and is behind a button, because it is
 * the part that needs judgement: what the ordering implies, which claims are
 * unfalsifiable, and — the one thing nothing else in JobOS can tell you —
 * what your journal proves that your resume never mentions.
 *
 * Splitting them this way is the whole design. A tool that answered the
 * regex questions with a model call would be slower, cost something, and be
 * less reliable at them; a tool that only had the regexes could never say
 * "you buried the interesting thing".
 */

const SEVERITY_META: Record<
  Severity,
  { label: string; tone: "danger" | "warning" | "info"; order: number }
> = {
  blocker: { label: "Fix before sending", tone: "danger", order: 0 },
  warning: { label: "Worth fixing", tone: "warning", order: 1 },
  polish: { label: "Polish", tone: "info", order: 2 },
};

/** What the score means, said in words rather than left to the colour. */
function verdictFor(score: number, blockers: number): string {
  if (blockers) return "Something here would stop a reader cold.";
  if (score >= 92) return "This is ready to send.";
  if (score >= 75) return "Solid. A few things left to tighten.";
  if (score >= 50) return "The bones are right, the writing is not there yet.";
  return "Early days — keep going.";
}

function ScoreDial({ score, blockers }: { score: number; blockers: number }) {
  // A conic gradient is the cheapest possible ring: no SVG, no library, and
  // it animates for free when the number changes.
  return (
    <div className="flex items-center gap-3.5">
      <div
        className="relative grid h-16 w-16 shrink-0 place-items-center rounded-pill transition-[background] duration-(--animate-duration-4) ease-out"
        style={{
          background: `conic-gradient(${
            blockers
              ? "var(--danger-line)"
              : score >= 75
                ? "var(--zest)"
                : "var(--craft)"
          } ${score * 3.6}deg, var(--bg-muted) 0deg)`,
        }}
        role="img"
        aria-label={`Resume score ${score} out of 100`}
      >
        <div className="grid h-[3.25rem] w-[3.25rem] place-items-center rounded-pill bg-surface">
          <span className="t-num text-xl font-bold text-fg">{score}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">
          {verdictFor(score, blockers)}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-fg-subtle">
          Counts down from 100 as things need fixing. It is a progress bar for
          the writing, not a judgement of the career.
        </p>
      </div>
    </div>
  );
}

function FindingRow({
  finding,
  style,
}: {
  finding: Finding;
  style?: React.CSSProperties;
}) {
  const meta = SEVERITY_META[finding.severity];
  return (
    <li
      style={style}
      className="flex items-start gap-2.5 rounded-control border border-line-subtle bg-surface px-3 py-2"
    >
      <Badge tone={meta.tone} className="mt-px shrink-0">
        {finding.where}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] leading-relaxed text-fg">
          {finding.message}
        </p>
        {finding.fix ? (
          <p className="mt-0.5 text-xs leading-relaxed text-fg-subtle">
            {finding.fix}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function ResumeDoctor({ data }: { data: ResumeData }) {
  // Pure and cheap — a few hundred string operations. Memoised only because
  // the AI half re-renders this component and there is no reason to redo it.
  const report = React.useMemo(() => lintResume(data), [data]);

  const [openGroups, setOpenGroups] = React.useState<Set<Severity>>(
    () => new Set<Severity>(["blocker", "warning"]),
  );

  const grouped = React.useMemo(() => {
    const map = new Map<Severity, Finding[]>();
    for (const f of report.findings) {
      const list = map.get(f.severity) ?? [];
      list.push(f);
      map.set(f.severity, list);
    }
    return [...map.entries()].sort(
      (a, b) => SEVERITY_META[a[0]].order - SEVERITY_META[b[0]].order,
    );
  }, [report.findings]);

  const pages = report.estimatedPages;

  return (
    <Card edge={report.counts.blocker ? "heat" : "spark"} className="p-4 sm:p-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Gauge className="h-4 w-4 text-fg-faint" strokeWidth={2} />
          <h2 className="text-base font-semibold text-fg">Check</h2>
          <Badge tone="neutral" className="ml-auto">
            <Zap className="h-2.5 w-2.5" strokeWidth={2.5} />
            Instant, no model
          </Badge>
        </div>

        <ScoreDial score={report.score} blockers={report.counts.blocker} />

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-sunken px-2.5 py-1 text-fg-muted">
            <FileWarning className="h-3 w-3" strokeWidth={2} />
            <span className="t-num font-semibold">{pages}</span>
            {pages === 1 ? "page" : "pages"}
            {pages > 2 ? " — too long for most readers" : ""}
          </span>
          {(["blocker", "warning", "polish"] as Severity[]).map((s) =>
            report.counts[s] ? (
              <Badge key={s} tone={SEVERITY_META[s].tone}>
                <span className="t-num">{report.counts[s]}</span>{" "}
                {SEVERITY_META[s].label.toLowerCase()}
              </Badge>
            ) : null,
          )}
        </div>

        {report.findings.length ? (
          <div className="space-y-2">
            {grouped.map(([severity, findings]) => {
              const open = openGroups.has(severity);
              return (
                <div key={severity}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((prev) => {
                        const next = new Set(prev);
                        if (next.has(severity)) next.delete(severity);
                        else next.add(severity);
                        return next;
                      })
                    }
                    aria-expanded={open}
                    className="flex w-full items-center gap-2 rounded-control px-1 py-1.5 text-left transition-colors duration-(--animate-duration-1) ease-out hover:bg-sunken"
                  >
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-fg-faint transition-transform duration-(--animate-duration-2) ease-(--ease-spring)",
                        open ? "rotate-0" : "-rotate-90",
                      )}
                      strokeWidth={2.25}
                    />
                    <span className="text-[0.8125rem] font-semibold text-fg">
                      {SEVERITY_META[severity].label}
                    </span>
                    <span className="t-num text-xs text-fg-faint">
                      {findings.length}
                    </span>
                  </button>
                  {open ? (
                    <ul className="fx-stagger mt-1 space-y-1.5">
                      {findings.map((f, i) => (
                        <FindingRow
                          key={f.id}
                          finding={f}
                          style={{ "--i": i } as React.CSSProperties}
                        />
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="fx-ping flex items-center gap-2 rounded-control border border-zest-line/40 bg-zest-soft px-3 py-2.5 text-[0.8125rem] font-medium text-zest-soft-fg">
            <ThumbsUp className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            Nothing mechanical left to fix. Nice.
          </p>
        )}

        <div className="border-t border-line-subtle pt-4">
          <ReadThrough />
        </div>
      </div>
    </Card>
  );
}

/* ── The model half ──────────────────────────────────────────────────────── */

const SEVERITY_TONE = {
  high: "danger",
  medium: "warning",
  low: "info",
} as const;

function ReadThrough() {
  const [state, run, pending] = React.useActionState<ReviewState, FormData>(
    reviewResumeAction,
    {},
  );

  const review = state.review;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Eye className="h-4 w-4 text-fg-faint" strokeWidth={2} />
        <h3 className="text-base font-semibold text-fg">The 30-second read</h3>
      </div>

      {!review && !pending ? (
        <p className="text-[0.8125rem] leading-relaxed text-fg-muted">
          What the checks above cannot see: whether the ordering makes sense
          for this career, which claims a reader would not believe, and what
          your journal proves that this document never mentions.
        </p>
      ) : null}

      {pending ? <Working label="Reading it the way a hiring manager would…" /> : null}
      {state.error ? <Failure message={state.error} /> : null}

      {review && !pending ? (
        <div className="fx-bounce space-y-3">
          <AiHeading title="How this reads" />

          {review.verdict ? (
            <p className="rounded-control border border-zest-line/40 bg-zest-soft/40 px-3 py-2.5 text-[0.8125rem] leading-relaxed text-fg">
              {review.verdict}
            </p>
          ) : null}

          {review.buried.length ? (
            <div>
              <p className="t-slate mb-1.5 flex items-center gap-1.5">
                <Lightbulb className="h-3 w-3" strokeWidth={2.5} />
                In your journal, not on your resume
              </p>
              <ul className="fx-cascade space-y-1.5">
                {review.buried.map((line, i) => (
                  <li
                    key={i}
                    style={{ "--i": i } as React.CSSProperties}
                    className="rounded-control border border-craft/40 bg-craft-soft px-3 py-2 text-[0.8125rem] leading-relaxed text-fg"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {review.findings.length ? (
            <div>
              <p className="t-slate mb-1.5">What is weak</p>
              <ul className="fx-cascade space-y-1.5">
                {review.findings.map((f, i) => (
                  <li
                    key={i}
                    style={{ "--i": i } as React.CSSProperties}
                    className="flex items-start gap-2.5 rounded-control border border-line-subtle bg-surface px-3 py-2"
                  >
                    <Badge tone={SEVERITY_TONE[f.severity]} className="mt-px shrink-0">
                      {f.where}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.8125rem] leading-relaxed text-fg">
                        {f.issue}
                      </p>
                      {f.fix ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-fg-subtle">
                          {f.fix}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {review.strengths.length ? (
            <div>
              <p className="t-slate mb-1.5">What works</p>
              <ul className="space-y-1">
                {review.strengths.map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-fg-muted"
                  >
                    <ThumbsUp
                      className="mt-0.5 h-3 w-3 shrink-0 text-zest"
                      strokeWidth={2.5}
                    />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Attribution provider={state.provider} remaining={state.remaining} />
        </div>
      ) : null}

      {!pending ? (
        <Button
          type="button"
          variant="zest"
          size="sm"
          className="fx-tap"
          onClick={() => React.startTransition(() => run(new FormData()))}
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
          {review ? "Read it again" : "Read my resume"}
        </Button>
      ) : null}
    </div>
  );
}
