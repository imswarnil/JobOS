import { z } from "zod";

/**
 * TURNING A TYPED LINE INTO A WELL-FILED ENTRY
 * ============================================
 *
 * The quick box already makes one line a complete entry — parser picks the
 * date, a verb table guesses the type. This is the step above it: hand the
 * line to a model and get back the entry a careful person would have filed.
 * A sharper title, the type chosen by meaning rather than by opening verb,
 * the technologies pulled into tags, and the outcome separated into the
 * impact field where the resume builder can find it later.
 *
 * THE RULE, same as everywhere a model touches this codebase: it reorganises
 * what you typed. It never adds. A journal is evidence — the resume builder
 * treats it as the source of truth, `unsupportedNumbers` vouches against it —
 * so an invented detail here poisons everything downstream. The prompt is a
 * closed-world instruction and the caller shows the proposal for confirmation
 * rather than filing it, which is the real safety: you read what it wrote
 * before it becomes part of your record.
 *
 * This is deliberately a *local-model* task. It is short-context rewriting,
 * the class of work llama3.2:3b measurably handles — so the default chain
 * order stands (ollama first) and nothing leaves your hardware unless the
 * box is down.
 */

/** Trims instead of rejecting — the lesson paid for in tailor/schema.ts:
 *  a hard `.max()` makes one verbose string fatal to an otherwise good
 *  answer, and small models are the population this chain runs on. */
function capped(max: number) {
  return z
    .string()
    .transform((v) => v.trim().slice(0, max))
    .pipe(z.string());
}

export const refinedLogSchema = z.object({
  /** The six log types. Anything else fails validation and falls through. */
  type: z.enum(["work", "learning", "challenge", "trick", "setback", "win"]),
  /** The headline. Sharp, factual, no trailing period. */
  title: capped(200).pipe(z.string().min(3)),
  /** Only when the typed text held more than a title's worth. Never padding. */
  body: capped(2000).default(""),
  /** Only when an outcome was actually stated. */
  impact: capped(500).default(""),
  techTags: z
    .array(z.unknown())
    .transform((items) =>
      items
        .filter((i): i is string => typeof i === "string")
        .map((i) => i.trim().toLowerCase().slice(0, 30))
        .filter(Boolean)
        .slice(0, 10),
    )
    .default([]),
  /** One line on what it changed, shown so the rewrite can be judged. */
  note: capped(200).default(""),
});

export type RefinedLog = z.infer<typeof refinedLogSchema>;

export const REFINE_SYSTEM = `You file work-journal entries for a software professional. You are given one line (sometimes a few) they typed in a hurry. Your job is to file it the way a careful person would have — NOT to embellish it.

The absolute rule: the typed text is the only thing that happened. Never add a technology, number, outcome, person or detail that is not in it. If the text says "made it faster", the entry says "made it faster" — no percentage, no benchmark. And never upgrade a verb: "worked on" does not become "improved", "helped with" does not become "led". Sharpening means fewer words, not bigger claims. An entry that overstates poisons the resume that is later built from it.

What you do:
- "title": the headline, sharpened. Lead with the strongest verb, drop filler, keep every fact. Twelve words or fewer when possible. No trailing period.
- "type": which of the six this really is, judged by meaning:
    work       ordinary work done — the default when nothing else clearly fits
    learning   they learned, read, studied or understood something
    challenge  they fought something hard — debugging, being blocked, grinding
    trick      a reusable technique, shortcut or tool worth remembering
    setback    something broke, failed, regressed or was lost
    win        something shipped, landed, finished or succeeded
- "body": ONLY if the text contains detail beyond the headline — reorganise that detail into a sentence or two. If the line is just a headline, return "".
- "impact": ONLY if the text states an outcome or consequence. Otherwise "".
- "techTags": technologies, tools, languages actually named in the text, lowercase. Nothing inferred — "fixed the API" does not mean they used any particular language. Tags are single technologies ("salesforce", "soql"), never phrases describing the work.
- "note": one short line on what you changed, e.g. "sharpened the title and filed as a win".

Reply with a single JSON object and nothing else.`;

export const REFINE_SHAPE = `{
  "type": "work | learning | challenge | trick | setback | win",
  "title": "the sharpened headline",
  "body": "detail beyond the headline, or \\"\\"",
  "impact": "the stated outcome, or \\"\\"",
  "techTags": ["only technologies literally mentioned"],
  "note": "what you changed, in one line"
}`;
