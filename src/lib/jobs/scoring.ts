import type { ResumeData } from "@/lib/resume/schema";

/**
 * SCORING A POSTING AGAINST WHAT YOU HAVE ACTUALLY DONE
 * ====================================================
 *
 * The question every job board answers badly: *should I spend an evening on
 * this one?* Boards answer it with keyword soup, because a keyword is all
 * they have about you. JobOS has the journal, which is a different kind of
 * evidence entirely — not "this word appears on your resume" but "you did
 * this, on this date, and here is what changed because of it".
 *
 * So the score is built from evidence, and every point of it can be traced
 * back to an entry. A score you cannot explain is a number people learn to
 * ignore.
 *
 * PURE ON PURPOSE. No model call, no network, no quota. That is not a
 * limitation, it is what makes scoring usable: discovery imports dozens of
 * postings per run, and a model pass over all of them would be minutes of
 * wall clock and a bill. This runs over a hundred jobs in a millisecond, so
 * everything gets scored, always. The model is spent on the shortlist this
 * produces — the same division as `lint.ts` and the resume review.
 *
 * RECENCY IS THE POINT. Postgres nine years ago and Postgres last month are
 * not the same claim, and a scorer that treats them alike will rank a role
 * you have grown out of above one you are ready for. Evidence decays.
 */

/** One skill the posting wants, and what the record says about it. */
export interface SkillEvidence {
  /** The skill as the posting named it. */
  skill: string;
  /** How many journal entries touch it. */
  entries: number;
  /** The most recent date it appears, ISO. Null when only the resume has it. */
  lastUsed: string | null;
  /** Months since `lastUsed`, or null. */
  monthsAgo: number | null;
  /** True when the resume claims it but no journal entry backs it up. */
  resumeOnly: boolean;
}

export interface ScoreBreakdown {
  /** 0–100. Null is never returned — an unscoreable job scores 0 with a reason. */
  score: number;
  /** Requirements the record supports, strongest evidence first. */
  matched: SkillEvidence[];
  /** Requirements with nothing behind them. The honest half. */
  missing: string[];
  /** One line per component, so the number can be argued with. */
  reasons: string[];
  /** Set when the posting was too thin to judge rather than a poor fit. */
  unscoreable?: string;
}

/**
 * What the evidence set looks like to the scorer.
 *
 * Deliberately not the database rows: scoring should be testable without a
 * connection, and the caller already has this loaded for other reasons.
 */
export interface ScoringEvidence {
  entries: Array<{
    occurredOn: string;
    title: string;
    body: string | null;
    impact: string | null;
    techTags: string[];
    tags: string[];
  }>;
  resume: ResumeData | null;
  criteria: {
    title: string;
    keywords: string[];
    location: string | null;
    remote: boolean;
    seniority: string | null;
  } | null;
}

export interface ScoreableJob {
  title: string;
  company: string | null;
  description: string | null;
  location: string | null;
  remote: boolean | null;
}

/* ── Normalisation ───────────────────────────────────────────────────────── */

/**
 * Skills are compared in a form that survives how people actually write them.
 *
 * "Node.js", "NodeJS" and "node js" are one skill; treating them as three is
 * how a scorer decides you have never used the thing you use daily.
 */
function norm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.\-_/]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * Words that match everything and therefore mean nothing.
 *
 * This list is long because a short one does not work, and the failure is
 * invisible until you look: with only the domain words filtered, the evidence
 * panel proudly reported that a Backend Engineer posting was "backed by your
 * journal" on the strength of *to, that, not, is, of, in, by, on, an, every,
 * than*. Every posting matched every journal on function words, the coverage
 * ratio was noise, and the number looked authoritative anyway.
 *
 * So: the ordinary English function words, plus the vocabulary every job
 * posting shares — "collaborate", "stakeholders", "fast-paced", the whole
 * genre. What survives is the part that actually distinguishes one role from
 * another.
 */
const NOISE = new Set(
  [
    // Function words. The ones that broke it.
    "a", "about", "above", "across", "after", "against", "all", "also", "an",
    "and", "any", "are", "around", "as", "at", "be", "because", "been", "before",
    "being", "below", "between", "both", "but", "by", "can", "could", "did",
    "do", "does", "doing", "down", "during", "each", "either", "else", "etc",
    "even", "ever", "every", "few", "for", "from", "further", "had", "has",
    "have", "having", "he", "her", "here", "hers", "him", "his", "how",
    "however", "i", "if", "in", "into", "is", "it", "its", "itself", "just",
    "least", "less", "like", "made", "make", "makes", "making", "many", "may",
    "me", "might", "more", "most", "much", "must", "my", "need", "needs",
    "neither", "no", "nor", "not", "now", "of", "off", "on", "once", "one",
    "only", "or", "other", "others", "our", "ours", "out", "over", "own",
    "per", "same", "she", "should", "since", "so", "some", "such", "than",
    "that", "the", "their", "theirs", "them", "then", "there", "these", "they",
    "this", "those", "through", "throughout", "to", "too", "under", "until",
    "up", "upon", "us", "use", "very", "was", "we", "well", "were", "what",
    "when", "where", "whether", "which", "while", "who", "whom", "why", "will",
    "with", "within", "without", "would", "you", "your", "yours",

    // Every job posting says these. They cannot separate two of them.
    "ability", "able", "across", "align", "aligned", "applicant", "applicants",
    "application", "apply", "approach", "background", "based", "benefits",
    "best", "build", "building", "business", "candidate", "candidates",
    "career", "challenges", "closely", "collaborate", "collaboration",
    "collaborative", "committed", "communication", "community", "company",
    "compensation", "complex", "contribute", "core", "culture", "customer",
    "customers", "daily", "data", "day", "deliver", "delivery", "design",
    "designing", "develop", "developer", "developers", "development",
    "different", "diverse", "diversity", "drive", "driven", "effective",
    "efficiency", "efficient", "employee", "employees", "employment",
    "engineer", "engineering", "ensure", "environment", "equal", "excellent",
    "experience", "experiences", "expertise", "fast", "features", "feedback",
    "first", "focus", "global", "goals", "good", "great", "group", "grow",
    "growth", "help", "high", "highly", "hiring", "impact", "improve",
    "including", "individual", "industry", "information",
    "initiatives", "innovation", "inclusive", "job", "join", "key", "knowledge",
    "large", "level", "look", "looking", "love", "maintain", "meet", "member",
    "members", "mission", "new", "office", "opportunities", "opportunity",
    "organization", "organisation", "other", "part", "partner", "partners",
    "passion", "people", "performance", "position", "positions", "practices",
    "process", "processes", "product", "products", "professional", "program",
    "project", "projects", "provide", "quality", "range", "record",
    "requirements", "responsibilities", "results", "role", "salary", "scale",
    "skills", "software", "solution", "solutions", "strong", "success",
    "successful", "support", "system", "systems", "take", "team", "teams",
    "technical", "technologies", "technology", "time", "tools", "together",
    "top", "training", "understand", "understanding", "used", "using", "values",
    "want", "work", "working", "world", "write", "years", "year",

    // Prose connectives that survived the first pass and turned up cited as
    // evidence, which is the only reason any of these are here.
    "rather", "line", "lines", "total", "text", "way", "ways", "thing",
    "things", "lot", "bit", "case", "cases", "point", "points", "end", "back",
    "next", "last", "long", "short", "small", "big", "left", "right", "given",
    "note", "notes", "run", "running", "ran", "got", "get", "getting", "went",
    "came", "put", "set", "sets", "keep", "kept", "found", "find", "still",
    "already", "instead", "actually", "really", "quite", "pretty", "maybe",

    // Markup that survives an imperfect HTML strip.
    "div", "span", "class", "href", "http", "https", "www", "nbsp", "amp", "li",
    "ul", "br", "strong", "em", "img", "src", "alt", "style",
  ].map(norm),
);

/** Multi-word technologies that must not be split into meaningless halves. */
const PHRASES = [
  "machine learning", "deep learning", "data engineering", "data science",
  "prompt engineering", "sales cloud", "service cloud", "marketing cloud",
  "experience cloud", "apex", "lightning web components", "web components",
  "ci cd", "unit testing", "integration testing", "message queue",
  "event driven", "micro services", "microservices", "kubernetes", "terraform",
  "salesforce", "postgres", "postgresql", "typescript", "javascript", "python",
  "react", "nextjs", "node", "graphql", "rest api", "sql", "docker", "aws",
  "azure", "gcp", "tableau", "power bi", "crm analytics", "einstein analytics",
];

/**
 * Every meaningful token in a piece of text. The raw vocabulary.
 *
 * Used for indexing the journal, where breadth is what you want — an entry is
 * short and every word in it was chosen. It is the wrong function for a job
 * posting, which is why `demandedSkills` exists below.
 */
export function skillsInText(text: string): string[] {
  const lower = ` ${text.toLowerCase()} `;
  const found = new Set<string>();

  for (const phrase of PHRASES) {
    if (lower.includes(` ${phrase} `) || lower.includes(`${phrase},`)) {
      found.add(phrase);
    }
  }

  for (const raw of text.split(/[^a-zA-Z0-9+#.]+/)) {
    const token = raw.trim();
    if (token.length < 2 || token.length > 30) continue;
    const n = norm(token);
    if (!n || NOISE.has(n) || /^\d+$/.test(n)) continue;
    found.add(token.toLowerCase());
  }

  return [...found];
}

/** A requirement, and how loudly the posting asks for it. */
interface Demand {
  skill: string;
  weight: number;
}

/**
 * What the posting is *actually asking for*, as opposed to every word in it.
 *
 * This distinction is the whole scorer. Running the tokeniser over a job
 * description returns 500-750 terms, and using that as the denominator makes
 * coverage about 2% for every posting ever written — which is exactly what
 * happened: eight wildly different GitLab roles all scored 33-35, because the
 * evidence component contributed roughly one point to each and the rest was
 * identical. A score that cannot tell a Backend Engineer role from a Director
 * of Engineering role is not a score.
 *
 * Three signals separate a requirement from a passing mention, and they are
 * weighted by how much they mean:
 *
 *   the title (3)  A word in the job title is the job. Nothing else comes
 *                  close as a signal of what the role actually is.
 *   repetition (2) A real requirement gets restated — in the summary, in the
 *                  responsibilities, in the "what you'll bring" list. A
 *                  technology named once is usually background colour.
 *   known tech (2) Terms from the phrase list are technologies by
 *                  construction, so one mention is enough.
 *
 * Everything else is dropped. The result is a few dozen terms rather than
 * several hundred, and the denominator becomes a number that means something.
 */
const REPEAT_THRESHOLD = 3;
const MAX_DEMANDS = 45;

export function demandedSkills(title: string, description: string): Demand[] {
  const demands = new Map<string, Demand>();

  const add = (skill: string, weight: number) => {
    const key = norm(skill);
    if (!key || NOISE.has(key)) return;
    const existing = demands.get(key);
    if (existing) existing.weight = Math.max(existing.weight, weight);
    else demands.set(key, { skill: skill.toLowerCase(), weight });
  };

  for (const token of skillsInText(title)) add(token, 3);

  const body = ` ${description.toLowerCase()} `;
  for (const phrase of PHRASES) {
    if (body.includes(` ${phrase} `) || body.includes(`${phrase},`)) {
      add(phrase, 2);
    }
  }

  // Count how often each term is restated.
  const counts = new Map<string, { n: number; display: string }>();
  for (const raw of description.split(/[^a-zA-Z0-9+#.]+/)) {
    const token = raw.trim();
    if (token.length < 2 || token.length > 30) continue;
    const n = norm(token);
    if (!n || NOISE.has(n) || /^\d+$/.test(n)) continue;
    const seen = counts.get(n);
    if (seen) seen.n += 1;
    else counts.set(n, { n: 1, display: token.toLowerCase() });
  }

  for (const [, { n, display }] of counts) {
    if (n >= REPEAT_THRESHOLD) add(display, 2);
  }

  return [...demands.values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_DEMANDS);
}

/**
 * Titles that describe running an organisation rather than building in one.
 *
 * Checked because the failure it prevents was observed: with no target role
 * set, "Director of Engineering" outranked "Backend Engineer" for a journal
 * full of Postgres and TypeScript entries. The title words overlap either way
 * — both say "engineering" — so nothing in the evidence caught it.
 *
 * Only applied when the journal contains no management evidence, so someone
 * who does lead teams is not penalised for the roles they should be seeing.
 */
const MANAGEMENT_TITLE =
  /\b(director|vp|vice president|head of|chief|cto|manager|managing)\b/i;

const MANAGEMENT_EVIDENCE =
  /\b(led|leading|managed|managing|mentored|hired|hiring|line manage|direct report|team of)\b/i;

/* ── The evidence index ──────────────────────────────────────────────────── */

interface IndexedSkill {
  entries: number;
  lastUsed: string | null;
  display: string;
  /**
   * True when this came from a `techTags`/`tags` field rather than prose.
   *
   * The distinction decides whether a match is believed. A tag was typed
   * deliberately — it is a claim about the entry. A word scraped out of the
   * body is just a word, and treating the two alike produced an evidence
   * panel citing "line", "re", "engine" and "text" as proof of fit.
   */
  fromTag: boolean;
}

/**
 * Everything the journal proves you have touched, with dates.
 *
 * `techTags` are weighted as first-class evidence because they were typed
 * deliberately; prose is scanned too, but a tag is a stronger claim than a
 * word that happened to appear in a sentence.
 */
function indexEvidence(evidence: ScoringEvidence): Map<string, IndexedSkill> {
  const index = new Map<string, IndexedSkill>();

  const note = (raw: string, date: string | null, fromTag: boolean) => {
    const key = norm(raw);
    if (!key || NOISE.has(key)) return;
    // Two characters is never a skill worth citing, and "re" and "ai" and
    // "id" all turned up as evidence before this line existed.
    if (!fromTag && key.length < 3) return;

    const existing = index.get(key);
    if (existing) {
      existing.entries += 1;
      existing.fromTag = existing.fromTag || fromTag;
      if (date && (!existing.lastUsed || date > existing.lastUsed)) {
        existing.lastUsed = date;
      }
    } else {
      index.set(key, { entries: 1, lastUsed: date, display: raw, fromTag });
    }
  };

  for (const entry of evidence.entries) {
    for (const tag of entry.techTags) note(tag, entry.occurredOn, true);
    for (const tag of entry.tags) note(tag, entry.occurredOn, true);
    // Prose counts for less — see `fromTag`.
    for (const token of skillsInText(
      [entry.title, entry.body, entry.impact].filter(Boolean).join(" "),
    )) {
      note(token, entry.occurredOn, false);
    }
  }

  return index;
}

/** Skills the resume claims, which count for less than evidence with a date. */
function resumeSkills(resume: ResumeData | null): Set<string> {
  const out = new Set<string>();
  if (!resume) return out;

  for (const section of resume.sections) {
    for (const item of section.items) {
      for (const tag of item.tags) out.add(norm(tag));
      for (const token of skillsInText(item.bullets.join(" "))) out.add(norm(token));
    }
  }
  return out;
}

/* ── Weights ─────────────────────────────────────────────────────────────── */

/**
 * How the 100 points are allocated.
 *
 * Evidence dominates deliberately. The other components are tie-breakers
 * between jobs you could plausibly do — they should never let a role you have
 * no evidence for outrank one you do.
 */
const WEIGHTS = {
  /** Requirements the journal can prove. The bulk of the score. */
  evidence: 60,
  /** How recently that evidence was created. */
  recency: 15,
  /** Does the title resemble the one you said you want. */
  title: 15,
  /** Location and remote against your stated criteria. */
  fit: 10,
} as const;

/** Evidence older than this contributes nothing to the recency component. */
const STALE_MONTHS = 36;

function monthsBetween(iso: string, now: Date): number {
  const then = new Date(iso);
  return Math.max(
    0,
    (now.getFullYear() - then.getFullYear()) * 12 +
      (now.getMonth() - then.getMonth()),
  );
}

/**
 * A posting needs enough text to be judged.
 *
 * Scoring a title-only row produces a confident-looking number derived from
 * eight words, which is worse than admitting there is nothing to go on —
 * the row is real, the score would not be.
 */
const MIN_DESCRIPTION = 200;

/* ── The score ───────────────────────────────────────────────────────────── */

export function scoreJob(
  job: ScoreableJob,
  evidence: ScoringEvidence,
  now: Date = new Date(),
): ScoreBreakdown {
  const description = (job.description ?? "").trim();

  if (description.length < MIN_DESCRIPTION) {
    return {
      score: 0,
      matched: [],
      missing: [],
      reasons: [],
      unscoreable:
        "No description was imported for this posting, so there is nothing to score against. Open it to read the real thing.",
    };
  }

  const index = indexEvidence(evidence);
  const claimed = resumeSkills(evidence.resume);

  // What the posting actually asks for, weighted — not every word in it.
  const wanted = demandedSkills(job.title, description);

  const matched: SkillEvidence[] = [];
  const missing: string[] = [];

  // Weighted so a requirement named in the title counts for more than one
  // mentioned three times in the body, on both sides of the ratio.
  let demandWeight = 0;
  let metWeight = 0;

  for (const { skill, weight } of wanted) {
    demandWeight += weight;
    const key = norm(skill);
    const hit = index.get(key);

    // A tagged skill is believed outright. A prose-only one has to appear in
    // at least two entries before it counts at all, and even then at half
    // weight: one passing mention of "code" in a journal body is not
    // evidence that you know something the posting is asking for.
    const believable = hit && (hit.fromTag || hit.entries >= 2);

    if (hit && believable) {
      metWeight += hit.fromTag ? weight : weight / 2;
      matched.push({
        skill,
        entries: hit.entries,
        lastUsed: hit.lastUsed,
        monthsAgo: hit.lastUsed ? monthsBetween(hit.lastUsed, now) : null,
        resumeOnly: false,
      });
    } else if (claimed.has(key) && key.length >= 3) {
      // A resume claim is a claim, not a demonstration. Worth a third.
      metWeight += weight / 3;
      matched.push({
        skill,
        entries: 0,
        lastUsed: null,
        monthsAgo: null,
        resumeOnly: true,
      });
    } else {
      missing.push(skill);
    }
  }

  // Strongest evidence first: most entries, then most recent.
  matched.sort((a, b) => {
    if (b.entries !== a.entries) return b.entries - a.entries;
    return (a.monthsAgo ?? 999) - (b.monthsAgo ?? 999);
  });

  const reasons: string[] = [];

  /* ── Evidence ──────────────────────────────────────────────────────────
     Proportion of what the posting asks for that the record can support,
     with a resume-only claim worth a third of a journalled one — it is a
     claim rather than a demonstration. */
  const backed = matched.filter((m) => !m.resumeOnly).length;
  const claimedOnly = matched.filter((m) => m.resumeOnly).length;
  const askedFor = Math.max(1, wanted.length);
  const coverage = demandWeight ? Math.min(1, metWeight / demandWeight) : 0;
  const evidencePoints = coverage * WEIGHTS.evidence;

  reasons.push(
    backed
      ? `${backed} of the ${askedFor} things this posting actually asks for appear in your journal${claimedOnly ? `, and ${claimedOnly} more only on your resume` : ""}.`
      : `None of the ${askedFor} things this posting asks for appear in your journal${claimedOnly ? ` — ${claimedOnly} appear on your resume with no entry behind them` : ""}.`,
  );

  /* ── Recency ───────────────────────────────────────────────────────────
     Scored on the freshest half of the matches rather than the average, so
     one ancient tag cannot drag down a currently-relevant match. */
  const dated = matched
    .filter((m) => m.monthsAgo !== null)
    .map((m) => m.monthsAgo as number)
    .sort((a, b) => a - b);

  let recencyPoints = 0;
  if (dated.length) {
    const half = dated.slice(0, Math.max(1, Math.ceil(dated.length / 2)));
    const avg = half.reduce((n, m) => n + m, 0) / half.length;
    recencyPoints = Math.max(0, 1 - avg / STALE_MONTHS) * WEIGHTS.recency;

    reasons.push(
      avg <= 3
        ? "You have been doing this work recently."
        : avg <= 12
          ? `Your strongest evidence here is about ${Math.round(avg)} months old.`
          : `Your evidence for this is ${Math.round(avg)} months old — you may have moved on from it.`,
    );
  }

  /* ── Title ─────────────────────────────────────────────────────────────
     Word overlap against the role you said you want, not against your last
     job title: the point of the search is where you are going. */
  let titlePoints = 0;
  // Criteria first, then the resume headline. Most people never fill in a
  // criteria row, and silently scoring every title identically because of
  // that is worse than using the headline they already wrote.
  const target =
    evidence.criteria?.title?.trim() || evidence.resume?.basics.headline?.trim();
  if (target) {
    const targetWords = new Set(
      skillsInText(target).map(norm).filter((w) => !NOISE.has(w)),
    );
    const jobWords = new Set(
      skillsInText(job.title).map(norm).filter((w) => !NOISE.has(w)),
    );
    const shared = [...targetWords].filter((w) => jobWords.has(w)).length;
    const ratio = targetWords.size ? shared / targetWords.size : 0;
    titlePoints = ratio * WEIGHTS.title;

    if (ratio >= 0.75) reasons.push(`The title matches "${target}" closely.`);
    else if (ratio > 0) reasons.push(`The title only partly matches "${target}".`);
    else reasons.push(`The title does not look like "${target}".`);
  }

  /* ── Fit ───────────────────────────────────────────────────────────────
     Location and remote. Cheap to check and the fastest disqualifier. */
  let fitPoints: number = WEIGHTS.fit;
  const criteria = evidence.criteria;
  if (criteria) {
    if (criteria.remote && job.remote === false) {
      fitPoints = 0;
      reasons.push("You want remote and this one is not.");
    } else if (criteria.location && job.location) {
      const wantsPlace = norm(criteria.location);
      const isPlace = norm(job.location);
      if (!isPlace.includes(wantsPlace) && !job.remote) {
        fitPoints = WEIGHTS.fit / 2;
        reasons.push(`Listed in ${job.location}, not ${criteria.location}.`);
      }
    }
  }

  /* ── Seniority ─────────────────────────────────────────────────────────
     A hard penalty rather than a component, because it is a different kind
     of statement: not "slightly worse fit" but "this is a different job". */
  let penalty = 0;
  if (MANAGEMENT_TITLE.test(job.title)) {
    const leads = evidence.entries.some((e) =>
      MANAGEMENT_EVIDENCE.test(
        [e.title, e.body, e.impact].filter(Boolean).join(" "),
      ),
    );
    if (!leads) {
      penalty = 25;
      reasons.push(
        "This is a management role and nothing in your journal describes leading or managing anyone.",
      );
    }
  }

  const score = Math.round(
    evidencePoints + recencyPoints + titlePoints + fitPoints - penalty,
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    // Capped for display: a posting mentions dozens of terms and a wall of
    // them is not more informative than the ten strongest.
    matched: matched.slice(0, 12),
    missing: missing.slice(0, 12),
    reasons,
  };
}

/** Plain-language band for a score, used for colour and copy. */
export function scoreBand(score: number): "strong" | "worth" | "stretch" | "weak" {
  if (score >= 70) return "strong";
  if (score >= 50) return "worth";
  if (score >= 30) return "stretch";
  return "weak";
}

export const BAND_LABEL: Record<ReturnType<typeof scoreBand>, string> = {
  strong: "Strong match",
  worth: "Worth a look",
  stretch: "A stretch",
  weak: "Probably not",
};
