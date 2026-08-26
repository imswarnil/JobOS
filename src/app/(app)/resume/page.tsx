import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { getOrCreateResume } from "@/lib/resume/queries";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { AddSection } from "@/components/resume/add-section";
import { BasicsForm } from "@/components/resume/basics-form";
import { ResumePreview } from "@/components/resume/resume-preview";
import { SectionEditor } from "@/components/resume/section-editor";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Resume" };
export const dynamic = "force-dynamic";

/**
 * Edit on the left, document on the right.
 *
 * The preview is the real thing rather than an approximation — same data,
 * rendered the way it will print — so there is no "export and see what
 * happened" step. On narrow screens the preview moves below the editor rather
 * than being hidden: seeing the result is the point.
 */
export default async function ResumePage() {
  const { data, updatedAt } = await getOrCreateResume();
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
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ── Editor ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <BasicsForm basics={data.basics} />

          {data.sections.map((section, i) => (
            <SectionEditor
              key={section.id}
              section={section}
              isFirst={i === 0}
              isLast={i === data.sections.length - 1}
            />
          ))}

          <AddSection />

          <p className="flex items-start gap-2 rounded-control border border-info-line/30 bg-info-bg px-3 py-2.5 text-xs leading-relaxed text-info-fg">
            <FileText className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            {/* TODO(Phase 2): React-PDF export rendering this same tree.
                TODO(Phase 3): generate bullets from journal entries. */}
            PDF export and tailoring a copy to a specific job description are
            next. Everything here is already stored as structured data, so both
            read from it rather than from a document.
          </p>
        </div>

        {/* ── Document ───────────────────────────────────────────────────── */}
        <div className="xl:sticky xl:top-24 xl:self-start">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="t-slate">Preview</span>
            <span className="text-xs text-fg-faint">
              One column, real text — what an ATS reads
            </span>
          </div>
          <div className="overflow-x-auto rounded-card bg-sunken p-3 sm:p-5">
            <ResumePreview data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
