"use server";

import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { company, workLog } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { ProviderError, completeJson } from "@/lib/llm/providers";
import {
  RateLimited,
  describeReset,
  getQuota,
  settleQuota,
  spendQuota,
} from "@/lib/llm/limit";
import {
  RESPONSE_SHAPE,
  SYSTEM_PROMPT,
  roleVerdictSchema,
  type RoleVerdict,
} from "@/lib/role/schema";

export interface RoleState {
  verdict?: RoleVerdict;
  error?: string;
  /** Set when the limit stopped it, so the UI can say when to come back. */
  rateLimited?: boolean;
  remaining?: number;
}

/** Fewer than this and the answer would be a guess wearing a lab coat. */
const MIN_ENTRIES = 3;

/**
 * The grounding set: the entries the model is allowed to reason from.
 *
 * Capped at 60 — enough to characterise someone's work, small enough to stay
 * well inside a free tier, and recent-first because what you did last quarter
 * describes you better than what you did two years ago.
 */
async function gatherEvidence(ownerId: string) {
  const db = getDb();

  return db
    .select({
      type: workLog.type,
      title: workLog.title,
      body: workLog.body,
      impact: workLog.impact,
      challenges: workLog.challenges,
      techTags: workLog.techTags,
      tags: workLog.tags,
      occurredOn: workLog.occurredOn,
      companyName: company.name,
      companyRole: company.role,
    })
    .from(workLog)
    .leftJoin(company, eq(workLog.companyId, company.id))
    .where(eq(workLog.ownerId, ownerId))
    .orderBy(desc(workLog.occurredOn))
    .limit(60);
}

function buildPrompt(rows: Awaited<ReturnType<typeof gatherEvidence>>): string {
  const entries = rows
    .map((r, i) =>
      [
        `#${i + 1} [${r.type}] ${r.occurredOn} — ${r.title}`,
        r.companyName
          ? `at: ${r.companyName}${r.companyRole ? ` (${r.companyRole})` : ""}`
          : "at: personal",
        r.body ? `detail: ${r.body}` : null,
        r.challenges ? `difficulty: ${r.challenges}` : null,
        r.impact ? `impact: ${r.impact}` : null,
        r.techTags.length ? `tech: ${r.techTags.join(", ")}` : null,
        r.tags.length ? `tags: ${r.tags.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

  return `Here are ${rows.length} journal entries from one person's working life, newest first.

${entries}

Return JSON in exactly this shape:
${RESPONSE_SHAPE}`;
}

/**
 * Reads the journal and names the job.
 *
 * Requires a session and spends one unit of the per-user rate limit. The
 * ledger row is written before the model is called, so a slow or hanging
 * provider still counts — see lib/llm/limit.ts.
 */
export async function defineRoleAction(): Promise<RoleState> {
  const user = await requireUser();
  const rows = await gatherEvidence(user.id);

  if (rows.length < MIN_ENTRIES) {
    return {
      error: `Log at least ${MIN_ENTRIES} entries first — with fewer than that, any answer would be a guess wearing a lab coat.`,
    };
  }

  let usageId: string;
  try {
    usageId = await spendQuota("define-role");
  } catch (error) {
    if (error instanceof RateLimited) {
      return {
        rateLimited: true,
        remaining: 0,
        error: `You have used all ${error.quota.limit} of your model requests. They come back ${describeReset(error.quota)}.`,
      };
    }
    throw error;
  }

  try {
    const { value, provider } = await completeJson(
      {
        system: SYSTEM_PROMPT,
        user: buildPrompt(rows),
        maxTokens: 4000,
        temperature: 0.6,
      },
      // A provider whose answer fails this has failed — the chain falls
      // through to the next one rather than surfacing a broken verdict.
      (raw) => roleVerdictSchema.parse(raw),
    );

    await settleQuota(usageId, { provider, ok: true });
    const quota = await getQuota();

    return { verdict: value, remaining: quota.remaining };
  } catch (error) {
    const detail =
      error instanceof ProviderError ? error.message : (error as Error).message;

    await settleQuota(usageId, {
      provider: error instanceof ProviderError ? error.provider : "unknown",
      ok: false,
      error: detail,
    });

    return {
      error:
        "The model could not produce a usable answer. That is usually temporary — try again in a minute.",
    };
  }
}

/** Read-only, for rendering the quota before anyone spends anything. */
export async function getQuotaAction() {
  return getQuota();
}
