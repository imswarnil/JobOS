import type { Metadata } from "next";
import Link from "next/link";
import { NotebookPen } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { getQuota } from "@/lib/llm/limit";
import { configuredProviders } from "@/lib/llm/providers";
import { getDb } from "@/lib/db";
import { workLog } from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { RoleReveal } from "@/components/role/role-reveal";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Define my role" };
export const dynamic = "force-dynamic";

export default async function RolePage() {
  const user = await requireUser();
  const db = getDb();

  const [[entries], quota] = await Promise.all([
    db
      .select({ n: count() })
      .from(workLog)
      .where(eq(workLog.ownerId, user.id)),
    getQuota(),
  ]);

  const entryCount = Number(entries?.n ?? 0);
  const providers = configuredProviders();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Define my role"
        description="Job titles are a mess — the same work is a “data engineer” at one company and an “analytics engineer” at the next, and the word you pick decides which adverts you even read. This reads your journal and picks one, from evidence."
        eyebrow={
          <>
            <Badge tone="special">AI</Badge>
            <span className="t-slate">
              {providers.length
                ? `${providers.join(" → ")} · ${quota.remaining}/${quota.limit} left`
                : "no provider configured"}
            </span>
          </>
        }
      />

      {entryCount < 3 ? (
        <div className="fx-fade rounded-card border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-control border border-line bg-surface text-fg-muted shadow-e1">
            <NotebookPen className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h3 className="mt-3 text-base font-semibold text-fg">
            Not enough to go on yet
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">
            You have {entryCount} {entryCount === 1 ? "entry" : "entries"}. With
            fewer than three, any answer would be a guess wearing a lab coat —
            and a confident wrong title is worse than no title.
          </p>
          <Link
            href="/journal?compose=1"
            className="fx-press mt-5 inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-fg-on-accent shadow-e1 transition-colors duration-200 ease-out hover:bg-accent-hover"
          >
            <NotebookPen className="h-4 w-4" strokeWidth={2.25} />
            Log something
          </Link>
        </div>
      ) : providers.length === 0 ? (
        <p className="rounded-control border border-warning-line/40 bg-warning-bg px-4 py-3 text-xs leading-relaxed text-warning-fg">
          No model provider is configured on this deployment. Set{" "}
          <code>GEMINI_API_KEY</code> or <code>GROQ_API_KEY</code> and redeploy.
        </p>
      ) : (
        <RoleReveal
          quota={{ remaining: quota.remaining, limit: quota.limit }}
          entryCount={entryCount}
        />
      )}
    </div>
  );
}
