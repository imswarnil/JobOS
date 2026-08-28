import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Filter, Inbox, RefreshCw } from "lucide-react";

import {
  countMissingDescriptions,
  hasAnyJobs,
  jobCounts,
  listScoredJobs,
} from "@/lib/jobs/queries";
import { PageHeader } from "@/components/page-header";
import { JobCard } from "@/components/jobs/job-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

/**
 * Ranked by how well the posting matches what you have actually done.
 *
 * Not chronological. A date-ordered job list is what every board already
 * gives you, and it is the reason nobody finishes reading one. The journal
 * exists so that something can put the right posting first.
 *
 * Scoring runs on read rather than being stored, so the order reflects who
 * you are this morning rather than who you were when the crawler last fired.
 * See `src/lib/jobs/queries.ts`.
 */

const FILTERS: Array<{ label: string; status?: ApplicationStatus }> = [
  { label: "Open" },
  { label: "Applied", status: "applied" },
  { label: "Interview", status: "interview" },
  { label: "Offer", status: "offer" },
  { label: "Not for me", status: "skipped" },
];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; min?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = FILTERS.find((f) => f.status === params.status)?.status;
  const minScore = Number(params.min) || 0;

  const [{ jobs, total, unscored }, counts, any, missingDescriptions] =
    await Promise.all([
      listScoredJobs({ status, minScore, q: params.q }),
      jobCounts(),
      hasAnyJobs(),
      countMissingDescriptions(),
    ]);

  const strong = jobs.filter((j) => j.breakdown.score >= 70).length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Jobs"
        description="Ranked against what your journal proves you have done — not against the keywords on your resume. Every score opens to show the entries behind it."
        eyebrow={
          <>
            <Badge tone="zest">Scored on your logs</Badge>
            {any ? (
              <span className="t-slate">
                {total} open · {strong} strong
              </span>
            ) : null}
          </>
        }
      />

      {!any ? (
        <Card className="bg-grid p-10 text-center">
          <Inbox
            className="mx-auto h-8 w-8 text-fg-faint"
            strokeWidth={1.5}
            aria-hidden
          />
          <h2 className="mt-3 text-base font-semibold text-fg">
            Nothing has been discovered yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-prose text-sm leading-relaxed text-fg-muted">
            Discovery runs on the VPS and posts what it finds to JobOS. Add the
            companies worth watching, or a job title to search for, and this
            fills up on the next run.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/settings"
              className="fx-tap inline-flex h-9 items-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-semibold text-fg hover:bg-sunken"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
              Check discovery
            </Link>
            <Link
              href="/journal"
              className="fx-tap bg-heat inline-flex h-9 items-center gap-2 rounded-control px-4 text-sm font-semibold text-fg-on-accent shadow-e1"
            >
              <Briefcase className="h-3.5 w-3.5" strokeWidth={2} />
              Log some work first
            </Link>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-fg-subtle">
            Scoring is only as good as the journal behind it. With no entries,
            every posting looks the same.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-fg-faint" strokeWidth={2} />
            {FILTERS.map((f) => {
              const active = f.status === status;
              const n = f.status ? (counts[f.status] ?? 0) : total;
              return (
                <Link
                  key={f.label}
                  href={f.status ? `/jobs?status=${f.status}` : "/jobs"}
                  scroll={false}
                  className={cn(
                    "fx-tap inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-xs font-semibold",
                    "transition-colors duration-(--animate-duration-1) ease-out",
                    active
                      ? "border-line-accent bg-accent-soft text-accent-soft-fg"
                      : "border-line bg-surface text-fg-muted hover:bg-sunken",
                  )}
                >
                  {f.label}
                  <span className="t-num opacity-70">{n}</span>
                </Link>
              );
            })}
          </div>

          {missingDescriptions ? (
            <p className="rounded-control border border-warning-line/40 bg-warning-bg px-3 py-2.5 text-xs leading-relaxed text-warning-fg">
              <strong className="font-semibold">
                {missingDescriptions}{" "}
                {missingDescriptions === 1 ? "posting" : "postings"}
              </strong>{" "}
              arrived with no description, so there is nothing to score them
              against. That is a discovery problem rather than a scoring one —
              the runner fetched a link but not the page behind it.
            </p>
          ) : null}

          {jobs.length ? (
            <ul className="fx-stagger space-y-3">
              {jobs.map((j, i) => (
                <JobCard key={j.id} job={j} index={i} />
              ))}
            </ul>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-sm text-fg-muted">
                Nothing here.{" "}
                {status
                  ? "No postings have reached this stage yet."
                  : "Everything has been dealt with."}
              </p>
            </Card>
          )}

          {unscored && !status ? (
            <p className="text-xs leading-relaxed text-fg-subtle">
              {unscored} of these could not be scored and are shown last.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
