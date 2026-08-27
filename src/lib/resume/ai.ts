import { z } from "zod";

/**
 * THE RESUME ASSISTANT
 * ====================
 *
 * Four operations, each small enough to be a button rather than a wizard:
 *
 *   draft       propose bullets for one role, from journal entries
 *   strengthen  rewrite one bullet three ways, so you choose rather than accept
 *   summarise   write the headline and summary from what is already there
 *   review      read the whole document and say what is weak
 *
 * They are separate on purpose. A single "improve my resume" button produces a
 * document you did not write and cannot defend in a room, and the failure only
 * surfaces at interview. Small operations on one bullet at a time keep the
 * author in the loop at the granularity where they can still tell whether the
 * sentence is true.
 *
 * `lint.ts` next door handles everything a regex can catch. This file is for
 * the things that genuinely need judgement, and nothing else — spending a
 * model call on "your bullet starts with Responsible for" would be slower,
 * cost something, and be less reliable than the regex already is.
 *
 * THE RULE, same as tailoring: these operations reword and reorganise facts
 * the author has already recorded. They do not add facts. Journal entries and
 * the existing resume are the closed evidence set; anything outside it is not
 * a fact and may not appear. Output is checked against that set by
 * `unsupportedNumbers` before it is shown.
 */

/* ── Shared voice ────────────────────────────────────────────────────────── */

/**
 * Prepended to every prompt here.
 *
 * Stated once and shared because these constraints must not drift between
 * operations: a rule that holds for "strengthen" and not for "draft" is worse
 * than no rule, since the author stops being able to predict which output
 * they need to check.
 */
const GROUND_RULES = `You help someone write their own resume. You are working from a closed set of evidence: their existing resume and their work journal. That set is the only thing you may treat as true.

Absolute constraints:
- Never introduce a technology, employer, client, date, team size, budget, user count or metric that is not in the evidence.
- Never turn a vague statement into a specific number. "Made it faster" does not become "improved performance by 40%". If the evidence has no number, the output has no number.
- Never upgrade scope or seniority. If they have never managed anyone, they did not lead a team.
- You may surface a real detail the resume omitted, if the journal contains it. That is the most useful thing you do.
- You may cut, reorder, compress and sharpen freely. That is the rest of what you do.

Voice:
- Past tense, no pronoun. "Rebuilt the ingest pipeline", not "I rebuilt" and not "Rebuilding".
- Open with the strongest verb available. Never "Responsible for", "Worked on", "Helped with".
- Outcome before method. What changed, then how, and only if the how is interesting.
- One claim per bullet. Two claims is two bullets.
- Plain words. No "leveraged", "spearheaded", "utilised", "synergy".

Reply with a single JSON object and nothing else.`;

/* ── 1 · Draft bullets from the journal ──────────────────────────────────── */

export const draftedBulletSchema = z.object({
  text: z.string().trim().min(1).max(600),
  /**
   * Which journal entry this came from, quoted closely enough that the author
   * can check it without going and finding the entry themselves.
   *
   * This field is the entire reason drafting is trustworthy. A bullet with a
   * basis can be verified in two seconds; a bullet without one has to be taken
   * on faith, and taking model output about your own career on faith is how
   * you end up defending a claim you never made.
   */
  basis: z.string().trim().min(1).max(400),
});

export const draftBulletsSchema = z.object({
  bullets: z.array(draftedBulletSchema).max(8).default([]),
  /** Said out loud when the journal simply had nothing for this role. */
  note: z.string().trim().max(300).default(""),
});

export type DraftedBullet = z.infer<typeof draftedBulletSchema>;
export type DraftBullets = z.infer<typeof draftBulletsSchema>;

export const DRAFT_SYSTEM = `${GROUND_RULES}

Your task: propose resume bullets for ONE role, drawn from the work journal entries supplied.

Propose at most six, and fewer is correct when the evidence is thin — a short list of bullets that are all true beats a full one padded with restatements. Two entries about the same piece of work become one bullet, not two.

Skip anything the resume already says. You are looking for what the journal knows that the resume does not.

Every bullet needs a "basis": the specific journal evidence it rests on, quoted or closely paraphrased, so the author can check it at a glance.

If the journal contains nothing usable for this role, return an empty array and say why in "note". That is a correct and useful answer — do not manufacture bullets to avoid it.`;

export const DRAFT_SHAPE = `{
  "bullets": [
    { "text": "the bullet, ready to paste", "basis": "the journal evidence it rests on" }
  ],
  "note": "empty, unless there was nothing usable — then say so plainly"
}`;

/* ── 2 · Strengthen one bullet ───────────────────────────────────────────── */

export const bulletVariantSchema = z.object({
  text: z.string().trim().min(1).max(600),
  /** One line on what this version does differently, so the choice is informed. */
  note: z.string().trim().max(200).default(""),
});

export const strengthenSchema = z.object({
  variants: z.array(bulletVariantSchema).max(4).default([]),
  /** What was weak about the original. Often more useful than the rewrites. */
  diagnosis: z.string().trim().max(400).default(""),
});

export type BulletVariant = z.infer<typeof bulletVariantSchema>;
export type Strengthened = z.infer<typeof strengthenSchema>;

export const STRENGTHEN_SYSTEM = `${GROUND_RULES}

Your task: rewrite ONE bullet three ways, and say what was weak about the original.

The three must be genuinely different approaches, not three shuffles of the same sentence. Useful axes:
- lead with the outcome rather than the activity
- compress hard — same claim, half the words
- surface the scale or the difficulty that the original left implicit, IF the evidence supports it

If the original bullet is already good, say so in "diagnosis" and return fewer variants. Rewriting a strong sentence to justify the button is a disservice.

The hard limit again, because this is where it gets broken: if the original has no number, none of the variants may have one. Making a claim more specific than the evidence is not strengthening it, it is fabricating it.`;

export const STRENGTHEN_SHAPE = `{
  "diagnosis": "what is weak about the original, in one or two sentences",
  "variants": [
    { "text": "the rewrite", "note": "what this version does differently" }
  ]
}`;

/* ── 3 · Headline and summary ────────────────────────────────────────────── */

export const summaryDraftSchema = z.object({
  headline: z.string().trim().max(160).default(""),
  summary: z.string().trim().max(800).default(""),
  /** What the summary chose to lead with, and why. */
  note: z.string().trim().max(300).default(""),
});

export type SummaryDraft = z.infer<typeof summaryDraftSchema>;

export const SUMMARY_SYSTEM = `${GROUND_RULES}

Your task: write the headline and the summary paragraph.

The headline is one line naming what this person is, in the words their industry uses. "Senior Backend Engineer · Payments & Infrastructure". Not an objective, not a sentence, never "seeking opportunities".

The summary is at most three sentences and earns its place or should not exist. It answers: what kind of engineer is this, at what scale have they worked, and what are they unusually good at. Every clause must be traceable to the evidence.

Banned outright, because they appear on every resume and mean nothing: "results-driven", "proven track record", "team player", "passionate about", "detail-oriented", "self-starter". If a sentence would survive being moved onto a stranger's resume unchanged, delete it and write a real one.`;

export const SUMMARY_SHAPE = `{
  "headline": "one line",
  "summary": "at most three sentences",
  "note": "what you led with and why"
}`;

/* ── 4 · Review the whole document ───────────────────────────────────────── */

export const reviewFindingSchema = z.object({
  /** The section or entry this is about, so the UI can point at it. */
  where: z.string().trim().max(160).default("Resume"),
  issue: z.string().trim().min(1).max(400),
  fix: z.string().trim().max(400).default(""),
  severity: z.enum(["high", "medium", "low"]).default("medium"),
});

export const reviewSchema = z.object({
  /** Two or three sentences: how this reads to someone with 30 seconds. */
  verdict: z.string().trim().max(800).default(""),
  /** What is genuinely working. Named specifically, or omitted. */
  strengths: z.array(z.string().trim().max(300)).max(6).default([]),
  findings: z.array(reviewFindingSchema).max(15).default([]),
  /**
   * Evidence in the journal that the resume never mentions — the highest-value
   * output here, because it is the one thing a reader of the resume alone
   * could never tell you.
   */
  buried: z.array(z.string().trim().max(300)).max(8).default([]),
});

export type ReviewFinding = z.infer<typeof reviewFindingSchema>;
export type Review = z.infer<typeof reviewSchema>;

export const REVIEW_SYSTEM = `${GROUND_RULES}

Your task: read this resume the way a hiring manager reads it — for thirty seconds, looking for a reason to stop.

Give a "verdict": what impression the document actually makes, in two or three sentences. Be honest rather than encouraging. "This reads as a competent generalist with no clear specialism" is a useful sentence; "Great foundation!" is not.

In "findings", name what is weak and how to fix it. Judgement only — do not report typos, missing dates, bullets that start with "Responsible for", or anything else mechanical. Those are already caught elsewhere and repeating them wastes the part of this that only you can do. Concentrate on: what the ordering implies, where the emphasis is wrong for the career being described, which claims are vague enough to be unfalsifiable, what a reader would assume that the author would not want assumed.

In "buried", list things the work journal shows that the resume does not mention and should. This is the most valuable section of your answer — it is the only part a reader of the resume alone could not produce.

In "strengths", name what genuinely works, specifically. An empty array is better than a generic compliment.`;

export const REVIEW_SHAPE = `{
  "verdict": "two or three honest sentences",
  "strengths": ["specific, or leave empty"],
  "findings": [
    { "where": "section or entry", "issue": "what is weak", "fix": "what to do", "severity": "high | medium | low" }
  ],
  "buried": ["what the journal shows that the resume does not"]
}`;
