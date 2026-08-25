import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Check,
  Circle,
  Flame,
  NotebookPen,
  Send,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { PHASES } from "@/lib/phases";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const firstName = user.name.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <PageHeader
        eyebrow={<span className="t-slate">{formatDate(new Date())}</span>}
        title={`Good to see you, ${firstName}.`}
        description="Nothing is logged yet — which is exactly what an empty career record looks like on day one. The fastest way to make this screen useful is to write down what you did today."
        actions={
          <Link
            href="/journal"
            className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-fg-on-accent shadow-e1 transition-colors duration-200 ease-out hover:bg-accent-hover active:bg-accent-press"
          >
            <NotebookPen className="h-4 w-4" strokeWidth={2.25} />
            Log today&rsquo;s work
          </Link>
        }
      />

      {/* TODO(Phase 1/4): these read from work_log and application, scoped by
          owner. Hardcoded zeros until then. */}
      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="At a glance"
      >
        <StatTile
          label="Logs this week"
          value={0}
          hint="Entries written in the last 7 days."
          icon={NotebookPen}
          tone="accent"
        />
        <StatTile
          label="Current streak"
          value={0}
          hint="Consecutive days with an entry."
          icon={Flame}
          tone="craft"
        />
        <StatTile
          label="Jobs matched"
          value={0}
          hint="Open roles above your match threshold."
          icon={Briefcase}
        />
        <StatTile
          label="Applications live"
          value={0}
          hint="Sent and not yet closed out."
          icon={Send}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Build roadmap</CardTitle>
            <p className="text-sm leading-relaxed text-fg-muted">
              JobOS is built in phases, each one useful on its own. This is
              where the build currently stands.
            </p>
          </CardHeader>
          <CardContent className="space-y-1">
            {PHASES.map((phase) => {
              const done = phase.status === "shipped";
              const active = phase.status === "building";

              return (
                <div
                  key={phase.id}
                  className="flex gap-3.5 rounded-control px-2 py-2.5 transition-colors duration-200 ease-out hover:bg-sunken"
                >
                  <span className="mt-0.5 shrink-0">
                    {done ? (
                      <Check className="h-4 w-4 text-success-fg" strokeWidth={2.5} />
                    ) : active ? (
                      <span className="grid h-4 w-4 place-items-center">
                        <span className="h-2 w-2 rounded-pill bg-accent" />
                      </span>
                    ) : (
                      <Circle className="h-4 w-4 text-fg-faint" strokeWidth={1.75} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={
                          active
                            ? "text-sm font-semibold text-fg"
                            : "text-sm font-medium text-fg-muted"
                        }
                      >
                        Phase {phase.id.slice(1)} · {phase.title}
                      </p>
                      {active ? <Badge tone="accent">In progress</Badge> : null}
                    </div>
                    <p className="mt-0.5 max-w-[62ch] text-xs leading-relaxed text-fg-subtle">
                      {phase.summary}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="bg-dots pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <CardHeader className="relative">
            <CardTitle>How JobOS works</CardTitle>
            <p className="text-sm leading-relaxed text-fg-muted">
              Four pillars, each feeding the next.
            </p>
          </CardHeader>
          <CardContent className="relative">
            <ol className="space-y-4 border-l border-line pl-5">
              {[
                {
                  n: "Journal",
                  t: "You log the work as it happens, in your own words.",
                },
                {
                  n: "Resume",
                  t: "That record becomes a structured master resume.",
                },
                {
                  n: "Tailoring",
                  t: "Each job description reshapes it — using only real facts.",
                },
                {
                  n: "Agent",
                  t: "Matching roles arrive, tailored and ready to send.",
                },
              ].map((step, i) => (
                <li key={step.n} className="relative">
                  <span className="t-num absolute top-0 -left-[1.6875rem] grid h-5 w-5 place-items-center rounded-pill border border-line bg-surface text-[0.625rem] font-bold text-fg-subtle">
                    {i + 1}
                  </span>
                  <p className="text-[0.8125rem] font-semibold text-fg">
                    {step.n}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-fg-subtle">
                    {step.t}
                  </p>
                </li>
              ))}
            </ol>

            <Link
              href="/journal"
              className="mt-6 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-fg-accent hover:gap-2.5"
            >
              Start with a log entry
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
