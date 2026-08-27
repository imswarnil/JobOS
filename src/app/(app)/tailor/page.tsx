import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { getQuota } from "@/lib/llm/limit";
import { configuredProviders } from "@/lib/llm/providers";
import { readResume } from "@/lib/resume/queries";
import { PageHeader } from "@/components/page-header";
import { TailorWorkbench } from "@/components/tailor/tailor-workbench";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Tailor to a job" };
export const dynamic = "force-dynamic";

export default async function TailorPage() {
  await requireUser();

  const [resume, quota] = await Promise.all([readResume(), getQuota()]);
  // "hosted" because that is the order this page actually uses — reading and
  // rewriting a posting are the two tasks the local 3B was measured failing.
  // Showing the default chain here would advertise a route nothing takes.
  const providers = configuredProviders("hosted");
  const hasResume = Boolean(resume?.sections.some((s) => s.items.length));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Tailor to a job"
        description="Paste a posting and get your resume rewritten to fit it — reordered, re-emphasised and cut, using only what your journal and resume already say. Where the posting wants something your record cannot support, it tells you instead of inventing it."
        eyebrow={
          <>
            <Badge tone="special">AI</Badge>
            <span className="t-slate">
              {providers.length
                ? `${providers.join(" → ")}${
                    Number.isFinite(quota.limit)
                      ? ` · ${quota.remaining}/${quota.limit} left`
                      : " · unmetered"
                  }`
                : "no provider configured"}
            </span>
          </>
        }
      />

      {providers.length === 0 ? (
        <p className="rounded-control border border-warning-line/40 bg-warning-bg px-4 py-3 text-xs leading-relaxed text-warning-fg">
          No model provider is configured on this deployment. Set{" "}
          <code>GEMINI_API_KEY</code>, <code>GROQ_API_KEY</code> or{" "}
          <code>OLLAMA_BASE_URL</code>.
        </p>
      ) : !hasResume ? (
        <div className="fx-fade rounded-card border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-control border border-line bg-surface text-fg-muted shadow-e1">
            <FileText className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h3 className="mt-3 text-base font-semibold text-fg">
            Nothing to tailor yet
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">
            Tailoring rearranges what you already have — it does not invent a
            career. Fill in your resume first.
          </p>
          <Link
            href="/resume"
            className="fx-press mt-5 inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-fg-on-accent shadow-e1 transition-colors duration-200 ease-out hover:bg-accent-hover"
          >
            <FileText className="h-4 w-4" strokeWidth={2.25} />
            Open the resume
          </Link>
        </div>
      ) : (
        <TailorWorkbench
          quota={{ remaining: quota.remaining, limit: quota.limit }}
          hasResume={hasResume}
        />
      )}
    </div>
  );
}
