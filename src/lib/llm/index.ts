/**
 * MODEL PROVIDER SEAM — Phase 3
 * =============================
 *
 * One interface, two implementations, chosen at runtime by which key is set.
 *
 *   primary   Google Gemini — generous free tier, long context, good enough
 *             at structured extraction to parse a job description reliably.
 *   fallback  Groq — used when Gemini rate-limits or errors. Same interface,
 *             so the caller never learns which one answered.
 *
 * The hard rule this seam exists to enforce: `tailorResume` may only reorder,
 * re-emphasise and re-word facts it is given. It must never invent an
 * employer, a date, a metric or a technology. A resume that lies is worse than
 * no resume, and the model is not the place to enforce that — the prompt and
 * the post-validation are.
 *
 * Nothing here is implemented in Phase 0.
 */

export interface ParsedJobDescription {
  title: string;
  company?: string;
  location?: string;
  remote: boolean;
  seniority?: string;
  /** Skills the posting treats as non-negotiable. */
  requiredSkills: string[];
  niceToHaveSkills: string[];
  responsibilities: string[];
  keywords: string[];
}

export interface TailorInput {
  /** The master resume, as stored in `resume_master.data`. */
  resume: unknown;
  /** The parsed posting to aim at. */
  jobDescription: ParsedJobDescription;
  /**
   * Journal entries the rewrite is allowed to draw on. This is the grounding
   * set — anything not present here is not a fact and may not appear.
   */
  facts: Array<{
    date: string;
    company?: string;
    project?: string;
    tasks: string;
    impact?: string;
    techTags: string[];
  }>;
}

export interface TailorResult {
  /** The rewritten resume, same shape as the input. */
  resume: unknown;
  /** What changed and why, so the rewrite can be reviewed rather than trusted. */
  rationale: string[];
  /** Requirements the journal contains no evidence for. Never fabricate these. */
  gaps: string[];
}

export interface LlmProvider {
  readonly name: string;
  /** Turn a raw posting (pasted text or fetched page) into structured fields. */
  parseJobDescription(raw: string): Promise<ParsedJobDescription>;
  /** Rewrite the resume against a posting, using only the supplied facts. */
  tailorResume(input: TailorInput): Promise<TailorResult>;
}

// TODO(Phase 3): implement against @google/generative-ai.
export const geminiProvider: LlmProvider = {
  name: "gemini",
  async parseJobDescription() {
    throw new Error("Not implemented until Phase 3 (Gemini).");
  },
  async tailorResume() {
    throw new Error("Not implemented until Phase 3 (Gemini).");
  },
};

// TODO(Phase 3): implement against the Groq OpenAI-compatible endpoint.
export const groqProvider: LlmProvider = {
  name: "groq",
  async parseJobDescription() {
    throw new Error("Not implemented until Phase 3 (Groq).");
  },
  async tailorResume() {
    throw new Error("Not implemented until Phase 3 (Groq).");
  },
};

/**
 * Picks a provider from the environment. Callers should depend on this rather
 * than importing a provider directly, so switching models is a config change.
 *
 * TODO(Phase 3): wrap the returned provider in a retry that falls through to
 * Groq on a Gemini rate-limit response.
 */
export function getLlmProvider(): LlmProvider {
  if (process.env.GEMINI_API_KEY) return geminiProvider;
  if (process.env.GROQ_API_KEY) return groqProvider;
  throw new Error(
    "No model provider configured. Set GEMINI_API_KEY or GROQ_API_KEY.",
  );
}
