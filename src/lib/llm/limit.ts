import "server-only";

import { and, count, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { llmUsage } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

/**
 * RATE LIMIT
 * ==========
 *
 * Every model call in JobOS runs on shared keys that I pay for, so the limit
 * is not a nicety — without it one enthusiastic user (or one retry loop)
 * empties the quota for everyone.
 *
 * Five calls per person per rolling 24 hours. Rolling rather than "per
 * calendar day" because a midnight reset invites people to sit and wait for
 * it, and because a window is a WHERE clause rather than a cron job.
 *
 * Enforced by counting rows in `llm_usage`, not by decrementing a counter: a
 * counter cannot tell you why you were blocked or when you will be unblocked,
 * and it cannot expire on its own. Rows can do all three, and they double as
 * the audit trail.
 */

/**
 * Five per person per rolling 24 hours by default, overridable — and `0`
 * means unmetered.
 *
 * The limit exists because the hosted providers run on shared keys someone
 * pays for. Point `LLM_PROVIDER_ORDER` at a self-hosted Ollama and that
 * reasoning evaporates: inference on your own hardware has no per-request
 * cost and no quota to exhaust, so capping it is just an obstacle. Set
 * `LLM_RATE_LIMIT=0` there.
 */
const DEFAULT_LIMIT = 5;

/**
 * Parsed defensively, because every wrong answer here fails open.
 *
 * `??` would not catch `LLM_RATE_LIMIT=""` — the shape .env.example uses for
 * every unset key — and `Number("")` is `0`, which this file reads as
 * unmetered. A typo would do the same via `NaN`. Either way the cap that
 * protects the shared hosted keys vanishes silently, so anything that is not
 * a deliberate non-negative number falls back to the default.
 */
function configuredLimit(): number {
  const raw = process.env.LLM_RATE_LIMIT?.trim();
  if (!raw) return DEFAULT_LIMIT;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_LIMIT;
}

export const LIMIT = configuredLimit();
export const WINDOW_HOURS = 24;

/** True when this deployment does not meter model use at all. */
export function isUnmetered(): boolean {
  return !Number.isFinite(LIMIT) || LIMIT <= 0;
}

export interface Quota {
  used: number;
  remaining: number;
  limit: number;
  /** When the oldest call in the window ages out, if any have been made. */
  resetsAt: Date | null;
}

/** What the current user has left. Requires a session — callers are gated. */
export async function getQuota(): Promise<Quota> {
  const user = await requireUser();

  if (isUnmetered()) {
    return {
      used: 0,
      remaining: Number.POSITIVE_INFINITY,
      limit: Number.POSITIVE_INFINITY,
      resetsAt: null,
    };
  }

  const db = getDb();

  const since = sql`now() - interval '${sql.raw(String(WINDOW_HOURS))} hours'`;

  const [row] = await db
    .select({ n: count(), oldest: sql<Date | null>`min(${llmUsage.createdAt})` })
    .from(llmUsage)
    .where(and(eq(llmUsage.ownerId, user.id), gte(llmUsage.createdAt, since)));

  const used = Number(row?.n ?? 0);
  const oldest = row?.oldest ? new Date(row.oldest) : null;

  return {
    used,
    remaining: Math.max(0, LIMIT - used),
    limit: LIMIT,
    resetsAt: oldest
      ? new Date(oldest.getTime() + WINDOW_HOURS * 60 * 60 * 1000)
      : null,
  };
}

export class RateLimited extends Error {
  constructor(public quota: Quota) {
    super("Rate limit reached");
    this.name = "RateLimited";
  }
}

/**
 * Records one call and returns the id, or throws `RateLimited`.
 *
 * The row is written *before* the provider is called, so a slow or hanging
 * request still counts against the limit. Two tabs firing at once can slip a
 * single extra call through — a transaction would close that, but the cost of
 * being one over is nil and the cost of holding a transaction across a
 * multi-second model call is not.
 */
export async function spendQuota(feature: string): Promise<string> {
  const user = await requireUser();

  // Still recorded when unmetered — the ledger is the audit trail as much as
  // the limit, and "which provider answered, and did it work" stays useful.
  if (!isUnmetered()) {
    const quota = await getQuota();
    if (quota.remaining <= 0) throw new RateLimited(quota);
  }

  const db = getDb();
  const [row] = await db
    .insert(llmUsage)
    .values({ ownerId: user.id, feature, provider: "pending", ok: true })
    .returning({ id: llmUsage.id });

  return row.id;
}

/**
 * Records how the call actually went, once it has.
 *
 * Best-effort by design. This is bookkeeping, and the quota was already spent
 * when the row was inserted — so a failure here (a dropped connection, a
 * blip) must not turn a successful model call into a 500 for the user. It is
 * swallowed and logged instead.
 */
export async function settleQuota(
  id: string,
  result: { provider: string; ok: boolean; error?: string },
): Promise<void> {
  try {
    const db = getDb();
    await db
      .update(llmUsage)
      .set({
        provider: result.provider,
        ok: result.ok,
        error: result.error?.slice(0, 500) ?? null,
      })
      .where(eq(llmUsage.id, id));
  } catch (error) {
    console.error("[llm] could not record usage", id, error);
  }
}

/** Human phrasing for "you are out", used in the UI. */
export function describeReset(quota: Quota): string {
  if (!quota.resetsAt) return "shortly";
  const ms = quota.resetsAt.getTime() - Date.now();
  if (ms <= 0) return "now";
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours <= 1) return "within the hour";
  return `in about ${hours} hours`;
}
