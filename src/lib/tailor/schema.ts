import { z } from "zod";

import { itemSchema, sectionSchema } from "@/lib/resume/schema";

/**
 * JD-TAILORED RESUME
 * ==================
 *
 * The one rule this whole file exists to enforce: **tailoring reorders and
 * re-words facts you already have. It never adds facts.**
 *
 * That is not a stylistic preference. A resume that overstates gets you into
 * an interview you cannot survive, and the person who wrote it usually did
 * not notice the overstatement happening. So the model is handed a closed set
 * of evidence — your journal entries and your existing resume — told it may
 * not go outside it, and every claim it makes is checked back against that
 * set afterwards (see `verify.ts`).
 *
 * Where the posting wants something the record cannot support, that is a
 * `gap`, reported honestly, not a bullet quietly invented to fill it.
 */

/* ── Parsing a posting ───────────────────────────────────────────────────── */

/**
 * A length limit that trims instead of rejecting.
 *
 * This distinction cost a real parse, so it is worth stating plainly. The
 * caps here exist to stop a model returning something unbounded — not to
 * police prose. But `.max(80)` on a skill makes an over-long skill *fatal*:
 * `completeJson` treats a schema failure as a provider failure, so one
 * verbose bullet in `niceToHaveSkills` discards the entire posting parse and
 * silently falls through to the next provider.
 *
 * Measured: llama3.2:3b parsing a live GitLab posting returned three
 * nice-to-haves as full sentences rather than skill names. Everything else in
 * the object was correct. Rejecting all of that over three long strings is
 * the wrong trade — the model was 95% right and got scored zero.
 *
 * Small models are worse at following "a skill is two words" than large ones,
 * which is exactly the population this chain is built to run on. So normalise
 * on the way in and keep the answer.
 */
function capped(max: number) {
  return z
    .string()
    .transform((v) => v.trim().slice(0, max))
    .pipe(z.string());
}

/** Same, for arrays: drops empties rather than failing on them. */
function cappedList(max: number, limit: number) {
  return z
    .array(z.unknown())
    .transform((items) =>
      items
        .filter((i): i is string => typeof i === "string")
        .map((i) => i.trim().slice(0, max))
        .filter(Boolean)
        .slice(0, limit),
    )
    .default([]);
}

export const parsedJobSchema = z.object({
  title: capped(160),
  company: capped(160).default(""),
  location: capped(160).default(""),
  remote: z.boolean().default(false),
  seniority: capped(60).default(""),
  /** What the posting treats as non-negotiable. */
  requiredSkills: cappedList(80, 25),
  niceToHaveSkills: cappedList(80, 25),
  responsibilities: cappedList(300, 20),
  /** The words worth echoing, because a keyword filter is looking for them. */
  keywords: cappedList(60, 40),
});

export type ParsedJob = z.infer<typeof parsedJobSchema>;

/**
 * Did the parse actually extract anything, or is it just well-formed?
 *
 * These are different failures and only one of them is visible. A model that
 * returns `{title: "AI Engineer", requiredSkills: [], keywords: [],
 * location: ""}` has satisfied every type in the schema and understood
 * nothing — and because it validates, `completeJson` accepts it and the
 * stronger providers behind it are never asked.
 *
 * Measured on the VPS: llama3.2:3b parsing a live GitLab posting returned
 * exactly that. Title right, eight responsibilities, and no skills, no
 * company and no location — from a page whose second line reads "Remote,
 * Bangalore". Tailoring against that produces a resume aimed at nothing.
 *
 * So emptiness is treated as failure, which is what makes the fallback chain
 * mean something: a small model gets first refusal and only keeps the work if
 * it did the work. Deliberately a floor rather than a quality score — three
 * skills or keywords is the difference between "read the posting" and "did
 * not", and anything cleverer would start rejecting terse but correct
 * answers.
 */
export function isUsableParse(job: ParsedJob): boolean {
  if (!job.title.trim()) return false;
  return job.requiredSkills.length + job.keywords.length >= 3;
}

export const PARSE_SYSTEM = `You read a job posting and turn it into structured fields.

Extract only what the posting actually says. Do not infer a seniority level that is not stated, do not invent a location, and do not pad the skill lists with things a role like this "usually" wants. An empty array is a correct answer.

Separate genuinely required skills from nice-to-haves — postings usually signal this with "must have" versus "bonus", "ideally", "a plus". When a posting does not distinguish, treat everything as required rather than guessing.

Reply with a single JSON object and nothing else.`;

export const PARSE_SHAPE = `{
  "title": "string — the role title as written",
  "company": "string — empty if not stated",
  "location": "string — empty if not stated",
  "remote": true/false,
  "seniority": "string — only if the posting says so, else empty",
  "requiredSkills": ["..."],
  "niceToHaveSkills": ["..."],
  "responsibilities": ["what the person will actually do"],
  "keywords": ["terms an automated filter would look for"]
}`;

/* ── Tailoring ───────────────────────────────────────────────────────────── */

/** A single rewritten bullet, carrying its own justification. */
export const tailoredBulletSchema = z.object({
  text: z.string().trim().min(1).max(600),
  /**
   * Which source this came from — an entry id or the original bullet.
   * The verifier uses it; the UI shows it so a claim can be traced.
   */
  basis: z.string().trim().max(400),
});

export const tailoredItemSchema = itemSchema.extend({
  bullets: z.array(z.string().trim().max(600)).max(12).default([]),
});

export const tailoredSectionSchema = sectionSchema.extend({
  items: z.array(tailoredItemSchema).max(50).default([]),
});

export const tailorResultSchema = z.object({
  /** A one-line summary rewritten to the posting, or "" to leave it alone. */
  summary: z.string().trim().max(800).default(""),
  /** The headline to put under the name for this application. */
  headline: z.string().trim().max(160).default(""),
  /** The rewritten sections, in the order they should be read for this role. */
  sections: z.array(tailoredSectionSchema).max(20).default([]),
  /**
   * What changed and why — so the rewrite can be reviewed rather than
   * trusted. One line per meaningful change.
   */
  rationale: z.array(z.string().trim().max(300)).max(20).default([]),
  /**
   * Requirements the record cannot support. The honest half of the output,
   * and the reason this is not just a keyword stuffer.
   */
  gaps: z
    .array(
      z.object({
        requirement: z.string().trim().max(200),
        why: z.string().trim().max(300),
      }),
    )
    .max(12)
    .default([]),
  /** 0–100, how well the record actually matches the posting. */
  matchScore: z.number().int().min(0).max(100),
});

export type TailorResult = z.infer<typeof tailorResultSchema>;

export const TAILOR_SYSTEM = `You rewrite a resume to fit one specific job posting, using only facts the candidate has already recorded.

You are given: the posting (already parsed), the candidate's current resume, and their work journal. The journal is the source of truth about what they have actually done.

THE RULE THAT OVERRIDES EVERYTHING ELSE: you may reorder, re-emphasise, re-word and cut. You may NOT add. Every rewritten bullet must correspond to something in the resume or the journal. If a bullet cannot be traced to a source, do not write it.

Concretely, this means:
- Never introduce a technology, employer, date, metric, team size or scope that is not in the sources.
- Never upgrade seniority. If they have never led anyone, they did not lead.
- Never convert a vague statement into a specific number. If the journal says "made it faster", the bullet says "made it faster".
- You MAY surface a real detail the current resume omitted, if the journal contains it.
- You MAY drop bullets that are irrelevant to this posting. Cutting is the main tool.

Reordering is your other main tool: put the sections and the entries that matter to this posting first.

For "gaps", list what the posting asks for that the record genuinely cannot support. This is the most useful part of your output — do not soften it, and do not leave it empty just because it looks better full. If they are missing something important, say so plainly.

"matchScore" is your honest read of fit, 0-100, based on evidence rather than optimism.

Reply with a single JSON object and nothing else.`;

export function tailorShape(): string {
  return `{
  "headline": "string — the role-facing headline, or \\"\\" to keep theirs",
  "summary": "string — rewritten summary, or \\"\\" to keep theirs",
  "sections": [
    {
      "id": "keep the id from the input",
      "title": "string",
      "kind": "experience | education | projects | skills | custom",
      "items": [
        {
          "id": "keep the id from the input",
          "title": "string", "subtitle": "string", "location": "string",
          "startDate": "string", "endDate": "string", "current": true/false,
          "url": "string",
          "bullets": ["rewritten, traceable to a source"],
          "tags": ["..."]
        }
      ]
    }
  ],
  "rationale": ["what you changed and why"],
  "gaps": [{ "requirement": "what the posting wants", "why": "what the record does not show" }],
  "matchScore": 0
}`;
}
