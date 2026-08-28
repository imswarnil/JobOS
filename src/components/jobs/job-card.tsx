"use client";

import * as React from "react";
import {
  Check,
  ChevronDown,
  ExternalLink,
  MapPin,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { setJobStatusAction, deleteJobAction } from "@/lib/jobs/actions";
import { BAND_LABEL, scoreBand } from "@/lib/jobs/scoring";
import type { ScoredJob } from "@/lib/jobs/queries";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * ONE POSTING, AND WHY IT SCORED WHAT IT SCORED
 * =============================================
 *
 * The number is the smallest part of this card. Any board can show you a
 * percentage; what none of them can show is *which entries in your journal*
 * back it up, because none of them have your journal.
 *
 * So the evidence is one click away, never behind a page load, and it names
 * dates. "Postgres — 7 entries, last used 2 months ago" is a sentence you can
 * act on. "84% match" is not.
 */

const BAND_STYLES = {
  strong: "border-zest text-zest-soft-fg bg-zest-soft",
  worth: "border-info-line/50 text-info-fg bg-info-bg",
  stretch: "border-warning-line/50 text-warning-fg bg-warning-bg",
  weak: "border-line text-fg-subtle bg-sunken",
} as const;

export function JobCard({ job, index }: { job: ScoredJob; index: number }) {
  const [open, setOpen] = React.useState(false);
  const band = scoreBand(job.breakdown.score);
  const unscoreable = job.breakdown.unscoreable;

  return (
    <li
      style={{ "--i": index } as React.CSSProperties}
      className={cn(
        "fx-lift rounded-card border bg-surface p-4 shadow-e1",
        band === "strong" && !unscoreable ? "border-zest-line/50" : "border-line",
      )}
    >
      <div className="flex items-start gap-3">
        {/* The score as a block rather than a bar — a bar invites comparison
            at a precision this number does not have. */}
        <div
          className={cn(
            "grid h-14 w-14 shrink-0 place-items-center rounded-control border-2",
            unscoreable ? BAND_STYLES.weak : BAND_STYLES[band],
          )}
          title={unscoreable ?? BAND_LABEL[band]}
        >
          {unscoreable ? (
            <span className="text-lg font-bold">?</span>
          ) : (
            <span className="t-num text-xl leading-none font-extrabold">
              {job.breakdown.score}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[0.9375rem] leading-tight font-semibold text-fg">
              {job.title}
            </h3>
            {job.status !== "found" ? (
              <Badge tone="accent">{job.status}</Badge>
            ) : null}
          </div>

          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fg-muted">
            {job.company ? (
              <span className="font-medium">{job.company}</span>
            ) : null}
            {job.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" strokeWidth={2} />
                {job.location}
              </span>
            ) : null}
            {job.remote ? <Badge tone="info">Remote</Badge> : null}
            <span className="text-fg-faint">
              {job.postedAt
                ? `posted ${formatDate(job.postedAt)}`
                : `found ${formatDate(job.createdAt)}`}
            </span>
            <span className="t-slate">{job.source}</span>
          </p>

          {unscoreable ? (
            <p className="mt-2 rounded-control border border-warning-line/40 bg-warning-bg px-2.5 py-1.5 text-xs leading-relaxed text-warning-fg">
              {unscoreable}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-fg-accent hover:underline"
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-(--animate-duration-2) ease-(--ease-spring)",
                  open ? "rotate-0" : "-rotate-90",
                )}
                strokeWidth={2.25}
              />
              {BAND_LABEL[band]} — why?
            </button>
          )}

          {open && !unscoreable ? (
            <div className="fx-bounce mt-2 space-y-2.5 rounded-control border border-line-subtle bg-sunken p-3">
              <ul className="space-y-1">
                {job.breakdown.reasons.map((reason, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 text-xs leading-relaxed text-fg-muted"
                  >
                    <Sparkles
                      className="mt-0.5 h-3 w-3 shrink-0 text-fg-faint"
                      strokeWidth={2}
                    />
                    {reason}
                  </li>
                ))}
              </ul>

              {job.breakdown.matched.length ? (
                <div>
                  <p className="t-slate mb-1">Backed by your journal</p>
                  <ul className="flex flex-wrap gap-1">
                    {job.breakdown.matched.map((m) => (
                      <li key={m.skill}>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[0.6875rem] font-medium",
                            m.resumeOnly
                              ? "border-line bg-surface text-fg-subtle"
                              : "border-zest-line/50 bg-zest-soft text-zest-soft-fg",
                          )}
                          title={
                            m.resumeOnly
                              ? "On your resume, but no journal entry backs it up"
                              : `${m.entries} ${m.entries === 1 ? "entry" : "entries"}${
                                  m.monthsAgo !== null
                                    ? `, last ${m.monthsAgo === 0 ? "this month" : `${m.monthsAgo}mo ago`}`
                                    : ""
                                }`
                          }
                        >
                          {m.skill}
                          {m.resumeOnly ? null : (
                            <span className="t-num opacity-70">{m.entries}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {job.breakdown.missing.length ? (
                <div>
                  <p className="t-slate mb-1">Nothing in your record for</p>
                  <p className="text-xs leading-relaxed text-fg-subtle">
                    {job.breakdown.missing.join(" · ")}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-subtle pt-3">
        {job.url ? (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="fx-tap inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-[0.8125rem] font-semibold text-fg hover:bg-sunken"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
            Open posting
          </a>
        ) : null}

        <form action={setJobStatusAction}>
          <input type="hidden" name="jobId" value={job.id} />
          <input type="hidden" name="status" value="applied" />
          <Button type="submit" variant="zest" size="sm" className="fx-tap">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            Applied
          </Button>
        </form>

        <form action={setJobStatusAction} className="ml-auto">
          <input type="hidden" name="jobId" value={job.id} />
          <input type="hidden" name="status" value="skipped" />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="fx-tap"
            title="Hidden from the list, and remembered — discovery will not resurface it"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            Not for me
          </Button>
        </form>

        <form action={deleteJobAction}>
          <input type="hidden" name="jobId" value={job.id} />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="fx-tap h-8 w-8"
            title="Delete. Discovery will find it again — use “Not for me” to keep it away."
            aria-label="Delete this posting"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          </Button>
        </form>
      </div>
    </li>
  );
}
