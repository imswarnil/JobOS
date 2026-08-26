import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";

import { listOrgs, listProjects } from "@/lib/career/queries";
import { PageHeader } from "@/components/page-header";
import { OrgList } from "@/components/career/org-list";
import { ProjectList } from "@/components/career/project-list";

export const metadata: Metadata = { title: "Career setup" };
export const dynamic = "force-dynamic";

/**
 * The one-time-ish screen that makes logging fast.
 *
 * Filling this in is what lets the composer default to your current employer
 * and offer real projects instead of an empty dropdown — so it earns its own
 * route rather than hiding inside Settings, where nobody would find it before
 * they needed it.
 */
export default async function SetupPage() {
  const [orgs, projects] = await Promise.all([listOrgs(), listProjects()]);
  const hasCurrent = orgs.some((o) => o.isCurrent);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Career setup"
        description="Where your work happens — employers, clients, courses and side projects. Fill this in once and logging becomes a sentence rather than a form."
        actions={
          <Link
            href="/journal"
            className="fx-press inline-flex h-10 items-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-semibold text-fg transition-colors duration-200 ease-out hover:border-line-strong hover:bg-sunken"
          >
            Go to journal
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </Link>
        }
      />

      {!hasCurrent ? (
        <p className="fx-fade flex items-start gap-2.5 rounded-control border border-info-line/30 bg-info-bg px-3.5 py-3 text-xs leading-relaxed text-info-fg">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          Nothing is marked as current yet. Star whichever employer or course
          you are in the middle of — new entries will default to it, which is
          the difference between logging in five seconds and logging in thirty.
        </p>
      ) : null}

      <OrgList orgs={orgs} />
      <ProjectList projects={projects} orgs={orgs} />
    </div>
  );
}
