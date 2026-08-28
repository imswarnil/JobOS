import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  FileText,
  Flame,
  NotebookPen,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { homeStats, strongMatchCount } from "@/lib/dashboard/queries";
import { dashboardStats, listEntries } from "@/lib/journal/queries";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EntryCard } from "@/components/journal/entry-card";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/**
 * WHAT IS THE STATE OF MY SEARCH, AND WHAT DO I DO NEXT
 * ====================================================
 *
 * Those are the only two questions a home screen owes an answer to, so those
 * are the only two things on it.
 *
 * What used to be here — a build roadmap and a four-step diagram of how JobOS
 * works — is gone. Both are things the app says *about itself*, which is
 * marketing copy on the screen you open every day. You already know how it
 * works; you opened it.
 *
 * The four stat tiles were also two-thirds fiction: jobs and applications
 * rendered hard-coded zeros with a TODO beside them. That is worse than
 * showing nothing, because it looks like data and gets read like data.
 */

/** One number, big. The whole tile is the link when there is somewhere to go. */
function Stat({
  label,
  value,
  hint,
  href,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint: string;
  href?: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="t-slate truncate">{label}</p>
        <Icon
          className={cn("h-4 w-4 shrink-0", accent ? "text-accent" : "text-fg-faint")}
          strokeWidth={2}
        />
      </div>
      <p
        className={cn(
          "t-num mt-2 text-[2.5rem] leading-none font-extrabold tracking-[-0.045em]",
          accent ? "t-gradient" : "text-fg",
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-fg-subtle">{hint}</p>
    </>
  );

  const className = cn(
    "block rounded-card border border-line bg-surface p-5",
    href && "fx-lift hover:border-line-strong",
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** The things you actually came here to do. */
function QuickAction({
  href,
  icon: Icon,
  title,
  hint,
  primary,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  hint: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "fx-tap group flex items-center gap-3 rounded-card border p-4",
        primary
          ? "bg-heat border-transparent text-fg-on-accent shadow-e2"
          : "border-line bg-surface hover:border-line-strong hover:bg-sunken",
      )}
    >
      <Icon
        className={cn("h-5 w-5 shrink-0", primary ? "" : "text-fg-muted")}
        strokeWidth={2.25}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span
          className={cn(
            "block text-xs leading-snug",
            primary ? "opacity-85" : "text-fg-subtle",
          )}
        >
          {hint}
        </span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 opacity-40 transition-transform duration-(--animate-duration-1) ease-(--ease-spring) group-hover:translate-x-0.5 group-hover:opacity-80"
        strokeWidth={2.5}
      />
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [stats, streakStats, recent, strong] = await Promise.all([
    homeStats(),
    dashboardStats(),
    listEntries({ limit: 3 }),
    strongMatchCount(),
  ]);

  const firstName = user.name.split(" ")[0];
  const empty = stats.entries === 0;

  /**
   * The one thing most worth doing, said in the subtitle.
   *
   * Ordered by what blocks what: with no journal nothing else works, with no
   * resume there is nothing to tailor, and a stale journal is the failure this
   * whole tool exists to prevent.
   */
  const nudge = empty
    ? "Nothing logged yet. One line about today is enough to start — everything else is built from it."
    : stats.daysSinceLog !== null && stats.daysSinceLog >= 3
      ? `Nothing logged for ${stats.daysSinceLog} days. The details are the first thing to go.`
      : !stats.resumeEntries
        ? "Your journal has material. Turn some of it into resume entries next."
        : strong
          ? `${strong} ${strong === 1 ? "posting is" : "postings are"} waiting to be looked at.`
          : `${stats.entries} entries on the record. The value compounds the moment you need a resume.`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <PageHeader title={`Good to see you, ${firstName}.`} description={nudge} />

      <section aria-label="Quick actions" className="grid gap-3 sm:grid-cols-2">
        <QuickAction
          href="/journal?compose=1"
          icon={NotebookPen}
          title="Log today's work"
          hint="One line. Ten seconds."
          primary
        />
        <QuickAction
          href="/jobs"
          icon={Briefcase}
          title="See what's worth applying to"
          hint={
            strong
              ? `${strong} scored against your journal`
              : "Nothing found yet — add a title to watch"
          }
        />
        <QuickAction
          href="/resume"
          icon={FileText}
          title="Work on the resume"
          hint={
            stats.resumeScore !== null
              ? `Scoring ${stats.resumeScore}/100`
              : "Empty — start from your journal"
          }
        />
        <QuickAction
          href="/tailor"
          icon={Wand2}
          title="Tailor it to a posting"
          hint="Paste a link, get a rewrite"
        />
      </section>

      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="At a glance"
      >
        <Stat
          label="Logged this week"
          value={stats.entriesThisWeek}
          hint={`${stats.entries} on the record in total.`}
          icon={NotebookPen}
          href="/journal"
          accent
        />
        <Stat
          label="Streak"
          value={streakStats.streak}
          hint={
            streakStats.streak > 0
              ? `${streakStats.streak} consecutive ${streakStats.streak === 1 ? "day" : "days"}.`
              : "Log two days running to start one."
          }
          icon={Flame}
        />
        <Stat
          label="Skills evidenced"
          value={stats.skills}
          hint="Distinct technologies your journal can prove."
          icon={Sparkles}
          href="/journal"
        />
        <Stat
          label="In the pipeline"
          value={stats.jobsOpen}
          hint={
            stats.interviewing
              ? `${stats.applied} applied · ${stats.interviewing} interviewing.`
              : stats.applied
                ? `${stats.applied} applied.`
                : "Postings you have not dealt with yet."
          }
          icon={Send}
          href="/jobs"
        />
      </section>

      {recent.length ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-fg">Latest entries</h2>
            <Link
              href="/journal"
              className="group flex items-center gap-1.5 text-sm font-semibold text-fg-accent"
            >
              Open the journal
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-(--animate-duration-1) ease-(--ease-spring) group-hover:translate-x-0.5"
                strokeWidth={2.5}
              />
            </Link>
          </div>
          {recent.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
