import "server-only";

import { and, count, eq, gte, notInArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { llmUsage } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { KNOWN_PROVIDERS, allSelfHosted, isSelfHosted } from "@/lib/llm/providers";

/**
 * RATE LIMIT
 * ==========
 *
 * A model call in JobOS may run on shared keys that I pay for, and when it
 * does the limit is not a nicety — without it one enthusiastic user (or one
 * retry loop) empties the quota for everyone. When it does not — when the
 * whole chain is self-hosted — the limit gets out of the way.
 *
 * Five calls per person per rolling 24 hours — but only while a hosted key is
 * in the chain. On a local-first deployment the cap lifts itself; see
 * `fallbackLimit` below. Rolling rather than "per calendar day" because a
 * midnight reset invites people to sit and wait for it, and because a window
 * is a WHERE clause rather than a cron job.
 *
 * Enforced by counting rows in `llm_usage`, not by decrementing a counter: a
 * counter cannot tell you why you were blocked or when you will be unblocked,
 * and it cannot expire on its own. Rows can do all three, and they double as
 * the audit trail.
 */

/**
 * Five per person per rolling 24 hours, when there is a paid key in the chain.
 *
 * The number is arbitrary; what it is protecting is not.
 */
const DEFAULT_LIMIT = 5;

/**
 * What the cap should be when nobody has said.
 *
 * The cap exists for exactly one reason: the hosted providers run on shared
 * keys someone pays for, and one retry loop can empty the quota for everyone.
 * With a local-first chain that reasoning can simply stop applying — if every
 * provider that would actually be called is self-hosted, there is no shared
 * key left to protect and the cap is pure obstacle.
 *
 * So the default is derived rather than fixed. Point JobOS at AnythingLLM
 * with no hosted keys set and metering disappears on its own, which is the
 * behaviour you want and the one nobody remembers to configure.
 */
function fallbackLimit(): number {
  return allSelfHosted() ? 0 : DEFAULT_LIMIT;
}

/**
 * Parsed defensively, because every wrong answer here changes who pays.
 *
 * `??` would not catch `LLM_RATE_LIMIT=""` — the shape .env.example uses for
 * every unset key — and `Number("")` is `0`, which this file reads as
 * unmetered. A typo would do the same via `NaN`. Either would silently remove
 * the cap protecting the hosted keys, so anything that is not a deliberate
 * non-negative number falls through to `fallbackLimit()`, which asks whether
 * there is anything to protect rather than assuming there is.
 */
function configuredLimit(): number {
  const raw = process.env.LLM_RATE_LIMIT?.trim();
  if (!raw) return fallbackLimit();

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallbackLimit();
}

export const LIMIT = configuredLimit();
export const WINDOW_HOURS = 24;

/**
 * Provider names whose calls are free.
 *
 * Derived from the provider table rather than written out, so adding a
 * self-hosted provider cannot leave a stale list here quietly metering it.
 */
const SELF_HOSTED = KNOWN_PROVIDERS.filter(isSelfHosted);

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
    .where(
      and(
        eq(llmUsage.ownerId, user.id),
        gte(llmUsage.createdAt, since),
        // Self-hosted answers are free, so they do not count. An unsettled
        // row still reads as "pending", which is not in this list and
        // therefore does count — deliberately, so a hung or looping call
        // cannot slip past the cap while it is in flight.
        notInArray(llmUsage.provider, SELF_HOSTED),
        // Neither does a call that failed. The cap rations something the
        // user receives, and a request where every provider errored
        // delivered nothing — being locked out of your own tool by three
        // requests that returned an error message is the cap working against
        // the person it exists to serve.
        //
        // The row survives either way: this is a ledger before it is a
        // counter, and "which provider failed, and why" is the most useful
        // thing in it. Retry loops stay bounded, because a call in flight is
        // `ok = true, provider = "pending"` and counts until it settles.
        eq(llmUsage.ok, true),
      ),
    );

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
