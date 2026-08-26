import type { Metadata } from "next";
import Link from "next/link";
import { Download, Eye, FileText } from "lucide-react";

import {
  getOrCreateResume,
  listVersions,
  readVersion,
} from "@/lib/resume/queries";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { AddSection } from "@/components/resume/add-section";
import { BasicsForm } from "@/components/resume/basics-form";
import { LayoutPanel } from "@/components/resume/layout-panel";
import { ResumePreview } from "@/components/resume/resume-preview";
import { SectionEditor } from "@/components/resume/section-editor";
import { VersionsPanel } from "@/components/resume/versions-panel";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Resume" };
export const dynamic = "force-dynamic";

/**
 * Edit on the left, document on the right.
 *
 * The preview is the real thing rather than an approximation — same data,
 * rendered the way it will print — so there is no "export and see what
 * happened" step. On narrow screens it moves below the editor rather than
 * being hidden: seeing the result is the point.
 *
 * `?version=` previews a snapshot instead. The editor stays bound to the
 * master, because editing a version in place would quietly defeat the reason
 * versions exist.
 */
export default async function ResumePage({
  searchParams,
}: {
  searchParams: Promise<{ version?: string }>;
}) {
  const params = await searchParams;

  const [{ data, updatedAt }, versions] = await Promise.all([
    getOrCreateResume(),
    listVersions(),
  ]);

  const viewing = params.version ? await readVersion(params.version) : null;

  // See the note beside <BasicsForm> below.
  const basicsKey = JSON.stringify(data.basics);
  const layoutKey = JSON.stringify(data.layout);
  const shown = viewing?.data ?? data;
  const itemCount = data.sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      <PageHeader
        title="Resume"
        description="One master resume, built from what you have actually done. Add the sections you need, in the order you want them read — the document on the right is what comes out."
        eyebrow={
          <>
            <Badge tone="accent">Master</Badge>
            <span className="t-slate">
              {itemCount} {itemCount === 1 ? "entry" : "entries"} · saved{" "}
              {formatDate(updatedAt)}
            </span>
          </>
        }
        actions={
          <a
            href={
              viewing
                ? `/print/resume?version=${params.version}&auto=1`
                : "/print/resume?auto=1"
            }
            target="_blank"
            rel="noopener"
            className="fx-press inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-fg-on-accent shadow-e1 transition-colors duration-200 ease-out hover:bg-accent-hover active:bg-accent-press"
          >
            <Download className="h-4 w-4" strokeWidth={2.25} />
            Download PDF
          </a>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ── Editor ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/*
            Keyed on the slice each panel renders.

            These forms seed their fields from props with useState and
            defaultValue, and neither re-runs when the server sends new data —
            so restoring a version, or saving from a second tab, left the
            editor showing values that no longer matched what was stored. That
            is worse than a stale read: it looks authoritative.

            Keyed on their own slice rather than on `updatedAt`, so adding a
            section does not remount the header form and discard whatever you
            were part-way through typing in it.
          */}
          <BasicsForm key={basicsKey} basics={data.basics} />

          {data.sections.map((section, i) => (
            <SectionEditor
              key={section.id}
              section={section}
              isFirst={i === 0}
              isLast={i === data.sections.length - 1}
            />
          ))}

          <AddSection />

          <LayoutPanel key={layoutKey} layout={data.layout} />

          <VersionsPanel versions={versions} viewingId={viewing ? params.version : undefined} />

          <p className="flex items-start gap-2 rounded-control border border-info-line/30 bg-info-bg px-3 py-2.5 text-xs leading-relaxed text-info-fg">
            <FileText className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            {/* TODO(Phase 2): React-PDF export rendering this same tree.
                TODO(Phase 3): generate bullets from journal entries. */}
            PDF export and tailoring a copy to a specific job description are
            next. Everything here is already structured data, so both read from
            it rather than from a document.
          </p>
        </div>

        {/* ── Document ───────────────────────────────────────────────────── */}
        <div className="xl:sticky xl:top-24 xl:self-start">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="t-slate">
              {viewing ? "Viewing a snapshot" : "Preview"}
            </span>
            <span className="flex items-center gap-3">
              {viewing ? (
                <Link
                  href="/resume"
                  scroll={false}
                  className="flex items-center gap-1.5 text-xs font-semibold text-fg-accent hover:underline"
                >
                  <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                  Back to the master
                </Link>
              ) : (
                <span className="hidden text-xs text-fg-faint sm:inline">
                  One column, real text — what an ATS reads
                </span>
              )}
            </span>
          </div>

          {viewing ? (
            <p className="mb-2 rounded-control border border-line-accent/40 bg-accent-soft px-3 py-2 text-xs text-accent-soft-fg">
              <strong className="font-semibold">{viewing.label}</strong> — a
              saved snapshot. Edits on the left still apply to the master.
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-card bg-sunken p-3 sm:p-5">
            <ResumePreview data={shown} />
          </div>
        </div>
      </div>
    </div>
  );
}
