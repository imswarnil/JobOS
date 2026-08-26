import { z } from "zod";

/**
 * WHAT AM I, ACTUALLY?
 * ====================
 *
 * The question this answers is a real one and not a joke: plenty of people
 * doing identical work call themselves a data engineer, a data analyst, an
 * analytics engineer or a BI developer, and the label they pick decides which
 * job ads they even read. Getting it wrong costs interviews.
 *
 * The answer has to come from evidence — what the person actually logged —
 * rather than from a vibe, which is why every field below is grounded:
 * `evidence` quotes their own entries back, and `alsoCalled` names the titles
 * they should be searching for as well.
 */

export const roleVerdictSchema = z.object({
  /** The one title to put at the top of a resume. */
  title: z.string().trim().min(1).max(80),
  /** One sentence on why this and not the neighbouring title. */
  reasoning: z.string().trim().min(1).max(500),
  /** How sure, given how much was logged. Low is an honest answer. */
  confidence: z.enum(["low", "medium", "high"]),
  /** Other titles for the same work — the ones to also search for. */
  alsoCalled: z.array(z.string().trim().max(60)).max(5).default([]),
  /** Titles they might think they are, and why they are not — the confusion. */
  notQuite: z
    .array(
      z.object({
        title: z.string().trim().max(60),
        why: z.string().trim().max(240),
      }),
    )
    .max(3)
    .default([]),
  /** The skills the evidence actually supports, for the resume. */
  strengths: z.array(z.string().trim().max(60)).max(8).default([]),
  /** Quoted from their own entries. The grounding. */
  evidence: z.array(z.string().trim().max(240)).max(5).default([]),
  /**
   * The party line. What you say when someone at a wedding asks what you do
   * and "I work on distributed billing systems" makes their eyes glaze.
   */
  explainToMum: z.string().trim().min(1).max(300),
  /** Two or three, self-deprecating, about the job rather than the person. */
  jokes: z.array(z.string().trim().max(240)).min(1).max(4),
  /** What is missing from the record that would sharpen this. */
  gaps: z.array(z.string().trim().max(200)).max(4).default([]),
});

export type RoleVerdict = z.infer<typeof roleVerdictSchema>;

export const SYSTEM_PROMPT = `You are a career analyst who reads someone's work journal and tells them what their job title actually is.

You exist because job titles are a mess. The same work gets called "data engineer" at one company and "analytics engineer" at another, and people apply to the wrong roles because they picked the wrong word for themselves. Your job is to pick the right word, from evidence.

Rules, in order of importance:

1. GROUND EVERYTHING. Every claim must trace to something in the entries. The "evidence" array must quote or closely paraphrase their actual entries. If the journal is thin, say so with confidence:"low" — a confident wrong answer is worse than an honest uncertain one.

2. NEVER INVENT. Do not add technologies, seniority, domains or achievements that are not in the entries. If they never mention managing anyone, they are not a lead.

3. BE SPECIFIC. "Software Engineer" is almost always a cop-out. Prefer the title that a hiring manager would recognise for this exact work.

4. NAME THE CONFUSION. "notQuite" is the most useful field: the adjacent titles they might wrongly claim, and the concrete thing missing from their record that would justify each.

5. THE JOKES ARE ABOUT THE JOB, NOT THE PERSON. Warm, dry, specific to the work they described. Never mocking their ability, their pay, or their employer. If nothing genuinely funny comes to mind, be gently absurd about the profession rather than forcing a punchline.

6. "explainToMum" is one sentence, no jargon, that a person outside tech would understand and repeat correctly.

Reply with a single JSON object and nothing else.`;

/** The shape, spelled out for the model — cheaper than a schema in the prompt. */
export const RESPONSE_SHAPE = `{
  "title": "string — the one title for the top of a resume",
  "reasoning": "string — one sentence: why this title and not the neighbouring one",
  "confidence": "low | medium | high",
  "alsoCalled": ["other titles for the same work, to also search for"],
  "notQuite": [{ "title": "adjacent title", "why": "the concrete thing missing from their record" }],
  "strengths": ["skills the entries actually demonstrate"],
  "evidence": ["quoted or closely paraphrased from their entries"],
  "explainToMum": "string — one jargon-free sentence",
  "jokes": ["2-3 warm, dry lines about this kind of work"],
  "gaps": ["what is missing from the journal that would sharpen this"]
}`;
