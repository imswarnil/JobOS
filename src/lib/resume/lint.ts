import type { ResumeData, ResumeSection } from "@/lib/resume/schema";

/**
 * THE INSTANT CHECKS
 * ==================
 *
 * Everything a resume reviewer would catch without thinking, done in pure
 * functions with no model, no network and no quota.
 *
 * This exists as a deliberate counterweight to the AI features next door.
 * Most of what is wrong with most resumes is not subtle — a bullet that opens
 * with "Responsible for", a role with no dates, a phone number missing, eleven
 * bullets under one job — and answering that class of question with a model
 * call is slow, costs something, and is *less* reliable than a regex. The
 * model should be spent on judgement; this handles the rest.
 *
 * Being pure is the point: no `server-only`, no imports beyond the schema, so
 * the editor can run this on every keystroke and the score moves as you type.
 * A check you have to request is a check you stop requesting.
 */

export type Severity = "blocker" | "warning" | "polish";

export interface Finding {
  id: string;
  severity: Severity;
  /** What is wrong, in one line, addressed to the person. */
  message: string;
  /** Where — a section title, an entry title, or "Header". */
  where: string;
  /** How to fix it. Omitted when the message already says. */
  fix?: string;
}

/**
 * Openers that describe a job description rather than a person.
 *
 * "Responsible for maintaining the pipeline" tells a reader what you were
 * *assigned*. "Cut pipeline failures from weekly to none" tells them what
 * happened. The first is the single most common thing wrong with a resume.
 */
const WEAK_OPENERS = [
  "responsible for",
  "duties included",
  "tasked with",
  "worked on",
  "helped with",
  "assisted with",
  "involved in",
  "participated in",
  "in charge of",
];

/** Phrases that survived from a job ad into a resume and mean nothing. */
const FILLER = [
  "team player",
  "self-starter",
  "results-driven",
  "detail-oriented",
  "hard worker",
  "go-getter",
  "think outside the box",
  "synergy",
  "dynamic professional",
  "proven track record",
];

/** A first-person opener. Resumes are written in implied first person. */
const FIRST_PERSON = /^\s*(i|we|my|our)\b/i;

/** Any digit that is not part of a bare year — i.e. a claim with a size. */
const HAS_METRIC = /\d/;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Bullets beyond this under one role stop being read. */
const MAX_BULLETS_PER_ITEM = 6;

/** Words past this and a bullet has become a paragraph. */
const LONG_BULLET_WORDS = 34;

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function checkHeader(data: ResumeData, out: Finding[]): void {
  const { basics } = data;
  const where = "Header";

  if (!basics.name.trim()) {
    out.push({
      id: "name-missing",
      severity: "blocker",
      where,
      message: "The resume has no name on it.",
    });
  }

  if (!basics.email.trim()) {
    out.push({
      id: "email-missing",
      severity: "blocker",
      where,
      message: "No email address — there is no way to reply to this.",
    });
  } else if (!EMAIL.test(basics.email.trim())) {
    out.push({
      id: "email-malformed",
      severity: "blocker",
      where,
      message: `“${basics.email}” is not a valid email address.`,
    });
  }

  if (!basics.headline.trim()) {
    out.push({
      id: "headline-missing",
      severity: "warning",
      where,
      message: "No headline under your name.",
      fix: "One line naming the role you want — “Senior Backend Engineer”, not an objective.",
    });
  }

  if (!basics.location.trim() && data.layout.header.includes("location")) {
    out.push({
      id: "location-missing",
      severity: "polish",
      where,
      message: "Location is switched on in the layout but empty.",
      fix: "Fill it in, or turn it off so the header does not render a gap.",
    });
  }

  const summary = basics.summary.trim();
  if (data.layout.showSummary && !summary) {
    out.push({
      id: "summary-empty",
      severity: "warning",
      where,
      message: "The summary is switched on but empty.",
    });
  } else if (summary && words(summary) > 90) {
    out.push({
      id: "summary-long",
      severity: "warning",
      where,
      message: `The summary runs to ${words(summary)} words.`,
      fix: "Three sentences is the ceiling — it is the first thing skipped when it is longer.",
    });
  }

  for (const phrase of FILLER) {
    if (summary.toLowerCase().includes(phrase)) {
      out.push({
        id: `summary-filler-${phrase.replace(/\s+/g, "-")}`,
        severity: "warning",
        where,
        message: `The summary says “${phrase}”.`,
        fix: "Every candidate claims this. Replace it with something only you could write.",
      });
    }
  }
}

function checkSection(section: ResumeSection, out: Finding[]): void {
  const where = section.title;

  if (!section.items.length) {
    out.push({
      id: `section-empty-${section.id}`,
      severity: "warning",
      where,
      message: "This section is empty and will render as a heading over nothing.",
      fix: "Add an entry or remove the section.",
    });
    return;
  }

  for (const item of section.items) {
    const label = item.title || "Untitled entry";

    // Skills sections carry tags, not dates or bullets — checking them for
    // either would be nagging about the shape working as designed.
    if (section.kind === "skills") {
      if (!item.tags.length) {
        out.push({
          id: `skills-empty-${item.id}`,
          severity: "warning",
          where,
          message: `“${label}” has no skills listed under it.`,
        });
      }
      continue;
    }

    if (!item.startDate.trim() && !item.current) {
      out.push({
        id: `dates-missing-${item.id}`,
        severity: section.kind === "experience" ? "warning" : "polish",
        where,
        message: `“${label}” has no dates.`,
        fix: "An unexplained gap in a timeline reads worse than a short stint.",
      });
    }

    if (section.kind === "experience" && !item.subtitle.trim()) {
      out.push({
        id: `employer-missing-${item.id}`,
        severity: "warning",
        where,
        message: `“${label}” does not say who it was for.`,
      });
    }

    if (!item.bullets.length && section.kind !== "education") {
      out.push({
        id: `bullets-missing-${item.id}`,
        severity: "warning",
        where,
        message: `“${label}” has no bullets — it is a job title with nothing under it.`,
      });
      continue;
    }

    if (item.bullets.length > MAX_BULLETS_PER_ITEM) {
      out.push({
        id: `bullets-many-${item.id}`,
        severity: "polish",
        where,
        message: `“${label}” has ${item.bullets.length} bullets.`,
        fix: `Past about ${MAX_BULLETS_PER_ITEM} they stop being read. Cut to the strongest.`,
      });
    }

    const withMetric = item.bullets.filter((b) => HAS_METRIC.test(b)).length;
    if (item.bullets.length >= 2 && withMetric === 0) {
      out.push({
        id: `no-metrics-${item.id}`,
        severity: "polish",
        where,
        message: `Nothing under “${label}” has a number in it.`,
        fix: "Scale is what separates a claim from a description. One number is usually enough.",
      });
    }

    item.bullets.forEach((bullet, i) => {
      const lower = bullet.toLowerCase().trim();
      const opener = WEAK_OPENERS.find((w) => lower.startsWith(w));

      if (opener) {
        out.push({
          id: `weak-opener-${item.id}-${i}`,
          severity: "warning",
          where,
          message: `A bullet under “${label}” opens with “${opener}”.`,
          fix: "That describes the job you were given. Lead with the verb for what you did.",
        });
      }

      if (FIRST_PERSON.test(bullet)) {
        out.push({
          id: `first-person-${item.id}-${i}`,
          severity: "polish",
          where,
          message: `A bullet under “${label}” starts with “${bullet.trim().split(/\s+/)[0]}”.`,
          fix: "Resumes drop the pronoun — the reader knows who it is about.",
        });
      }

      if (words(bullet) > LONG_BULLET_WORDS) {
        out.push({
          id: `long-bullet-${item.id}-${i}`,
          severity: "polish",
          where,
          message: `A bullet under “${label}” runs to ${words(bullet)} words.`,
          fix: "Split it, or cut the setup and keep the outcome.",
        });
      }

      for (const phrase of FILLER) {
        if (lower.includes(phrase)) {
          out.push({
            id: `filler-${item.id}-${i}-${phrase.replace(/\s+/g, "-")}`,
            severity: "warning",
            where,
            message: `A bullet under “${label}” says “${phrase}”.`,
            fix: "Cut it. It reads as padding because it is.",
          });
        }
      }
    });
  }
}

export interface LintReport {
  findings: Finding[];
  /** 0–100. Not a grade — a countdown of things left to fix. */
  score: number;
  counts: Record<Severity, number>;
  /** Rough page count, from the density the layout actually renders at. */
  estimatedPages: number;
}

/** How much a finding of each severity costs the score. */
const WEIGHT: Record<Severity, number> = {
  blocker: 14,
  warning: 5,
  polish: 2,
};

/**
 * Every deterministic complaint about a document, plus a score.
 *
 * The score is deliberately blunt — it starts at 100 and each finding takes
 * points off. It is not a judgement of the career, and the copy around it
 * should never imply that it is; it is a progress bar for "have I finished
 * writing this".
 */
export function lintResume(data: ResumeData): LintReport {
  const findings: Finding[] = [];

  checkHeader(data, findings);
  for (const section of data.sections) checkSection(section, findings);

  const items = data.sections.flatMap((s) => s.items);
  if (!items.length) {
    findings.push({
      id: "resume-empty",
      severity: "blocker",
      where: "Resume",
      message: "There is nothing on this resume yet.",
      fix: "Add a role under Experience — everything else builds on it.",
    });
  }

  const counts: Record<Severity, number> = { blocker: 0, warning: 0, polish: 0 };
  for (const f of findings) counts[f.severity]++;

  const penalty = findings.reduce((n, f) => n + WEIGHT[f.severity], 0);

  return {
    findings,
    score: Math.max(0, 100 - penalty),
    counts,
    estimatedPages: estimatePages(data),
  };
}

/**
 * A rough page count, in "lines the template will render".
 *
 * Approximate on purpose. The exact answer needs the browser's layout engine,
 * which the editor does not have and which the print preview already provides
 * for real. What this is for is the one question worth answering while typing:
 * am I about to spill onto a second page?
 */
export function estimatePages(data: ResumeData): number {
  const perPage = data.layout.style === "compact" ? 58 : data.layout.style === "modern" ? 50 : 46;

  let lines = 6; // the header block
  if (data.layout.showSummary && data.basics.summary) {
    lines += Math.ceil(words(data.basics.summary) / 14) + 1;
  }

  for (const section of data.sections) {
    lines += 2; // heading and its rule
    for (const item of section.items) {
      lines += 2; // title line and subtitle line
      if (section.kind === "skills") {
        lines += Math.ceil(item.tags.join(", ").length / 90) || 1;
        continue;
      }
      for (const bullet of item.bullets) {
        lines += Math.max(1, Math.ceil(words(bullet) / 15));
      }
    }
  }

  return Math.max(1, Math.round((lines / perPage) * 10) / 10);
}
