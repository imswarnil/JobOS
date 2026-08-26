import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getOrCreateResume, readVersion } from "@/lib/resume/queries";
import { ResumePreview } from "@/components/resume/resume-preview";
import { PrintTrigger } from "@/components/resume/print-trigger";

export const metadata: Metadata = {
  title: "Resume",
  // A printed page should not advertise itself to search engines.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The document on its own, ready to print.
 *
 * Deliberately outside the `(app)` group so it inherits none of the shell —
 * no sidebar, no topbar, nothing to strip. What the browser prints is exactly
 * what a company receives.
 *
 * The PDF comes from the browser's own print pipeline rather than a rendering
 * library, and that is the point: an export built from a second template
 * drifts from the preview, and you discover the drift after someone has
 * already read the drifted copy. Same DOM, same CSS, real selectable text —
 * which is also what an applicant tracking system needs.
 *
 * `?version=<id>` prints a saved snapshot instead of the master.
 * `?auto=1` opens the print dialog on load, so the download is one click.
 */
export default async function PrintResumePage({
  searchParams,
}: {
  searchParams: Promise<{ version?: string; auto?: string }>;
}) {
  const params = await searchParams;

  const version = params.version ? await readVersion(params.version) : null;
  if (params.version && !version) notFound();

  const { data } = version ? { data: version.data } : await getOrCreateResume();

  // The browser uses the document title as the default PDF filename.
  const name = data.basics.name?.trim() || "Resume";
  const filename = version
    ? `${name} — ${version.label}`
    : `${name} — Resume`;

  return (
    <>
      <title>{filename}</title>
      <PrintTrigger auto={params.auto === "1"} filename={filename} />

      <div className="min-h-svh bg-sunken py-8 print:bg-white print:py-0">
        <ResumePreview data={data} />
      </div>
    </>
  );
}
