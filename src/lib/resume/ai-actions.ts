"use server";

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
  evidenceCorpus,
  evidenceToText,
  forEmployer,
  gatherEvidence,
  resumeToText,
} from "@/lib/journal/evidence";
import { readResume } from "@/lib/resume/queries";
import { parseResume, type ResumeData } from "@/lib/resume/schema";
import { unsupportedNumbers } from "@/lib/tailor/verify";
import {
  DRAFT_SHAPE,
  DRAFT_SYSTEM,
  REVIEW_SHAPE,
  REVIEW_SYSTEM,
  STRENGTHEN_SHAPE,
  STRENGTHEN_SYSTEM,
  SUMMARY_SHAPE,
  SUMMARY_SYSTEM,
  draftBulletsSchema,
  reviewSchema,
  strengthenSchema,
  summaryDraftSchema,
  type DraftedBullet,
  type BulletVariant,
  type Review,
} from "@/lib/resume/ai";

/**
 * THE ASSISTANT'S SERVER SIDE
 * ===========================
 *
 * Four actions, one shape. Each one loads the evidence, spends a unit of
 * quota, asks the chain, and checks the answer for invented numbers before
 * handing it back.
 *
 * Nothing here writes to the database. That is the important structural
 * decision: every one of these returns a *proposal*, and it only becomes part
 * of the resume when the author picks it and the existing `saveItemAction` or
 * `saveBasicsAction` stores it. An assistant that edits the document directly
 * is one that can quietly change a sentence you would not have signed, and you
 * would find out in an interview.
 */

/* ── Shared plumbing ─────────────────────────────────────────────────────── */

interface Base {
  error?: string;
  rateLimited?: boolean;
  remaining?: number;
  /** Which provider answered, so "why is this slow/bad" has an answer. */
  provider?: string;
}

/** The message shown when the chain is exhausted, or nothing is configured. */
function providerFailure(error: unknown): string {
  if (error instanceof ProviderError && error.provider === "none") {
    // A configuration problem, not a transient one. Say which.
    return "No model is configured. Point ANYTHINGLLM_BASE_URL at your local workspace, or set a hosted key — see Settings.";
  }
  return "No model in the chain could answer that. Check the chain in Settings, or try again in a moment.";
}

/**
 * Wraps one model call in quota accounting.
 *
 * The unit is spent before the call and settled after, so a hung provider
 * still counts — see the note in `limit.ts`. Callers get either the value or a
 * `Base` describing what went wrong, and never have to think about the ledger.
 */
async function withQuota<T>(
  feature: string,
  run: () => Promise<{ value: T; provider: string }>,
): Promise<{ ok: true; value: T; provider: string; remaining: number } | { ok: false; state: Base }> {
  let usageId: string;
  try {
    usageId = await spendQuota(feature);
  } catch (error) {
    if (error instanceof RateLimited) {
      return {
        ok: false,
        state: {
          rateLimited: true,
          remaining: 0,
          error: `That is all ${error.quota.limit} model requests for now. They come back ${describeReset(error.quota)} — or point JobOS at a local model and the cap lifts entirely.`,
        },
      };
    }
    throw error;
  }

  try {
    const { value, provider } = await run();
    await settleQuota(usageId, { provider, ok: true });
    const quota = await getQuota();
    return { ok: true, value, provider, remaining: quota.remaining };
  } catch (error) {
    await settleQuota(usageId, {
      provider: error instanceof ProviderError ? error.provider : "unknown",
      ok: false,
      error: (error as Error).message,
    });
    return { ok: false, state: { error: providerFailure(error) } };
  }
}

/** The resume, or null with a reason the caller can return directly. */
async function loadResume(
  name: string,
): Promise<{ resume: ResumeData } | { error: string }> {
  const stored = await readResume();
  const resume = stored ?? parseResume(null, name);
  if (!resume.sections.some((s) => s.items.length)) {
    return {
      error:
        "There is nothing on the resume yet. Add a role first — the assistant works from what you have, it does not invent a career.",
    };
  }
  return { resume };
}

/* ── 1 · Draft bullets for one role ──────────────────────────────────────── */

export interface DraftState extends Base {
  bullets?: DraftedBullet[];
  /** Bullets carrying a number no source vouches for, flagged not removed. */
  flagged?: Record<number, string[]>;
  note?: string;
  /** How many journal entries the draft was actually drawn from. */
  drawnFrom?: number;
}

/**
 * Proposes bullets for one entry, from the journal.
 *
 * This is the operation the whole journal exists to make possible: you logged
 * the work when you remembered it, and months later the resume writes itself
 * from the record rather than from what you can recall on a Sunday evening.
 */
export async function draftBulletsAction(
  _prev: DraftState,
  formData: FormData,
): Promise<DraftState> {
  const user = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const employer = String(formData.get("subtitle") ?? "").trim();
  const existing = String(formData.get("bullets") ?? "").trim();

  if (!title) {
    return { error: "Give this entry a title first — the draft is written for a specific role." };
  }

  const loaded = await loadResume(user.name);
  if ("error" in loaded) return { error: loaded.error };

  const all = await gatherEvidence(user.id);
  const relevant = forEmployer(all, employer);

  if (!relevant.length) {
    return {
      error:
        "Your journal has nothing to draw on yet. Log a few entries about this work and the draft will have something true to say.",
    };
  }

  const result = await withQuota("resume-draft-bullets", () =>
    completeJson(
      {
        system: DRAFT_SYSTEM,
        user: [
          `THE ROLE THESE BULLETS ARE FOR:\n${title}${employer ? ` at ${employer}` : ""}`,
          existing
            ? `\nWHAT THE RESUME ALREADY SAYS ABOUT IT (do not repeat these):\n${existing}`
            : "\nThe resume says nothing about it yet.",
          `\nTHE WORK JOURNAL — the only thing you may treat as true:\n${evidenceToText(relevant)}`,
          `\nReturn JSON in exactly this shape:\n${DRAFT_SHAPE}`,
        ].join("\n"),
        maxTokens: 2500,
        temperature: 0.5,
      },
      (v) => draftBulletsSchema.parse(v),
    ),
  );

  if (!result.ok) return result.state;

  const corpus = evidenceCorpus(loaded.resume, all);
  const flagged: Record<number, string[]> = {};
  result.value.bullets.forEach((bullet, i) => {
    const unsupported = unsupportedNumbers(bullet.text, corpus);
    if (unsupported.length) flagged[i] = unsupported;
  });

  return {
    bullets: result.value.bullets,
    note: result.value.note,
    flagged,
    provider: result.provider,
    remaining: result.remaining,
    drawnFrom: relevant.length,
  };
}

/* ── 2 · Strengthen one bullet ───────────────────────────────────────────── */

export interface StrengthenState extends Base {
  variants?: BulletVariant[];
  diagnosis?: string;
  flagged?: Record<number, string[]>;
  /** Echoed back so the UI knows which bullet these belong to. */
  target?: string;
}

export async function strengthenBulletAction(
  _prev: StrengthenState,
  formData: FormData,
): Promise<StrengthenState> {
  const user = await requireUser();

  const bullet = String(formData.get("bullet") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const employer = String(formData.get("subtitle") ?? "").trim();

  if (bullet.length < 12) {
    return { error: "Write the bullet first, then this can sharpen it." };
  }

  const loaded = await loadResume(user.name);
  if ("error" in loaded) return { error: loaded.error };

  const all = await gatherEvidence(user.id);
  const relevant = forEmployer(all, employer);

  const result = await withQuota("resume-strengthen", () =>
    completeJson(
      {
        system: STRENGTHEN_SYSTEM,
        user: [
          `THE BULLET TO REWRITE:\n${bullet}`,
          `\nWHERE IT SITS:\n${title}${employer ? ` at ${employer}` : ""}`,
          `\nTHE EVIDENCE — the only thing you may treat as true. If it contains no number, your rewrites contain no number:\n${evidenceToText(relevant)}`,
          `\nReturn JSON in exactly this shape:\n${STRENGTHEN_SHAPE}`,
        ].join("\n"),
        maxTokens: 1800,
        temperature: 0.6,
      },
      (v) => strengthenSchema.parse(v),
    ),
  );

  if (!result.ok) return result.state;

  const corpus = evidenceCorpus(loaded.resume, all);
  const flagged: Record<number, string[]> = {};
  result.value.variants.forEach((variant, i) => {
    const unsupported = unsupportedNumbers(variant.text, corpus);
    if (unsupported.length) flagged[i] = unsupported;
  });

  return {
    variants: result.value.variants,
    diagnosis: result.value.diagnosis,
    flagged,
    target: bullet,
    provider: result.provider,
    remaining: result.remaining,
  };
}

/* ── 3 · Headline and summary ────────────────────────────────────────────── */

export interface SummaryState extends Base {
  headline?: string;
  summary?: string;
  note?: string;
  flagged?: string[];
}

export async function writeSummaryAction(
  _prev: SummaryState,
  _formData: FormData,
): Promise<SummaryState> {
  const user = await requireUser();

  const loaded = await loadResume(user.name);
  if ("error" in loaded) return { error: loaded.error };

  const all = await gatherEvidence(user.id);

  const result = await withQuota("resume-summary", () =>
    completeJson(
      {
        system: SUMMARY_SYSTEM,
        user: [
          `THE RESUME AS IT STANDS:\n${resumeToText(loaded.resume)}`,
          `\nTHE WORK JOURNAL:\n${evidenceToText(all.slice(0, 60))}`,
          `\nReturn JSON in exactly this shape:\n${SUMMARY_SHAPE}`,
        ].join("\n"),
        maxTokens: 1200,
        temperature: 0.6,
      },
      (v) => summaryDraftSchema.parse(v),
    ),
  );

  if (!result.ok) return result.state;

  const corpus = evidenceCorpus(loaded.resume, all);

  return {
    headline: result.value.headline,
    summary: result.value.summary,
    note: result.value.note,
    flagged: unsupportedNumbers(
      `${result.value.headline} ${result.value.summary}`,
      corpus,
    ),
    provider: result.provider,
    remaining: result.remaining,
  };
}

/* ── 4 · Review the whole document ───────────────────────────────────────── */

export interface ReviewState extends Base {
  review?: Review;
}

/**
 * The thirty-second read.
 *
 * Deliberately narrow: the prompt is told not to report anything mechanical,
 * because `lint.ts` already catches all of that instantly and for free. What
 * is left is the part that actually needs a reader — what the ordering
 * implies, which claims are unfalsifiable, and what the journal proves that
 * the resume never mentions.
 */
export async function reviewResumeAction(
  _prev: ReviewState,
  _formData: FormData,
): Promise<ReviewState> {
  const user = await requireUser();

  const loaded = await loadResume(user.name);
  if ("error" in loaded) return { error: loaded.error };

  const all = await gatherEvidence(user.id);

  const result = await withQuota("resume-review", () =>
    completeJson(
      {
        system: REVIEW_SYSTEM,
        user: [
          `THE RESUME:\n${resumeToText(loaded.resume)}`,
          `\nTHE WORK JOURNAL — use this to find what the resume leaves out:\n${evidenceToText(all)}`,
          `\nReturn JSON in exactly this shape:\n${REVIEW_SHAPE}`,
        ].join("\n"),
        maxTokens: 3000,
        temperature: 0.5,
      },
      (v) => reviewSchema.parse(v),
    ),
  );

  if (!result.ok) return result.state;

  return {
    review: result.value,
    provider: result.provider,
    remaining: result.remaining,
  };
}
