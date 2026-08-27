import "server-only";

import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { company, workLog } from "@/lib/db/schema";
import { buildSourceCorpus } from "@/lib/tailor/verify";
import type { ResumeData } from "@/lib/resume/schema";

/**
 * THE EVIDENCE SET
 * ================
 *
 * Everything a model in JobOS is allowed to treat as true, in one place.
 *
 * Both the tailoring flow and the resume assistant need the same three
 * things — the journal rows, those rows flattened into prompt text, and a
 * normalised corpus to check the answer against — and having each feature
 * build its own was how the two would eventually disagree about what counts
 * as evidence. Which is precisely the thing that must not drift: the guarantee
 * is "nothing outside this set appears in the output", and a guarantee is only
 * as good as there being one definition of the set.
 */

/** How far back a single prompt reaches. Enough to cover a career, capped so
 *  a heavy journal cannot blow the context window. */
const MAX_ENTRIES = 120;

export async function gatherEvidence(owner: string, limit = MAX_ENTRIES) {
  const db = getDb();
  return db
    .select({
      title: workLog.title,
      body: workLog.body,
      impact: workLog.impact,
      challenges: workLog.challenges,
      techTags: workLog.techTags,
      occurredOn: workLog.occurredOn,
      companyName: company.name,
    })
    .from(workLog)
    .leftJoin(company, eq(workLog.companyId, company.id))
    .where(eq(workLog.ownerId, owner))
    .orderBy(desc(workLog.occurredOn))
    .limit(limit);
}

export type EvidenceRow = Awaited<ReturnType<typeof gatherEvidence>>[number];

/**
 * Narrows the evidence to one employer, by name.
 *
 * Matched loosely and in both directions, because the resume says "Acme" and
 * the journal says "Acme Corp" about as often as the reverse. Entries with no
 * company attached are always kept: `company_id` is nullable precisely so that
 * personal work can be logged, and a lot of the best evidence for a role is
 * side work done during it.
 */
export function forEmployer(rows: EvidenceRow[], employer: string): EvidenceRow[] {
  const needle = employer.trim().toLowerCase();
  if (!needle) return rows;

  return rows.filter((r) => {
    if (!r.companyName) return true;
    const name = r.companyName.toLowerCase();
    return name.includes(needle) || needle.includes(name);
  });
}

/** The journal, flattened into the text a prompt reads. */
export function evidenceToText(rows: EvidenceRow[]): string {
  if (!rows.length) return "(no journal entries)";

  return rows
    .map((r) =>
      [
        `- ${r.occurredOn} ${r.title}${r.companyName ? ` (${r.companyName})` : ""}`,
        r.body ? `  ${r.body}` : null,
        r.challenges ? `  difficulty: ${r.challenges}` : null,
        r.impact ? `  impact: ${r.impact}` : null,
        r.techTags.length ? `  tech: ${r.techTags.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
}

/**
 * The haystack every numeric claim is checked against.
 *
 * Built once per request rather than per bullet: `unsupportedNumbers` runs
 * across a whole document, and re-normalising the corpus each time would make
 * verification quadratic in the size of the resume for no benefit.
 */
export function evidenceCorpus(
  resume: ResumeData,
  rows: EvidenceRow[],
): string {
  const fromResume = resume.sections.flatMap((s) =>
    s.items.flatMap((i) => [
      i.title,
      i.subtitle,
      i.location,
      i.startDate,
      i.endDate,
      ...i.bullets,
      ...i.tags,
    ]),
  );

  const fromJournal = rows.flatMap((r) => [
    r.title,
    r.body,
    r.impact,
    r.challenges,
    ...r.techTags,
  ]);

  return buildSourceCorpus([
    ...fromResume,
    ...fromJournal,
    resume.basics.summary,
    resume.basics.headline,
  ]);
}

/** The resume as the prompt sees it — no ids, no layout, just the document. */
export function resumeToText(resume: ResumeData): string {
  const header = [
    resume.basics.name,
    resume.basics.headline,
    resume.basics.location,
  ]
    .filter(Boolean)
    .join(" · ");

  const body = resume.sections
    .map((section) => {
      const items = section.items
        .map((item) => {
          const head = [item.title, item.subtitle, item.location]
            .filter(Boolean)
            .join(" — ");
          const dates = [item.startDate, item.current ? "Present" : item.endDate]
            .filter(Boolean)
            .join(" to ");
          const lines = [`  ${head}${dates ? ` (${dates})` : ""}`];
          for (const bullet of item.bullets) lines.push(`    • ${bullet}`);
          if (item.tags.length) lines.push(`    tags: ${item.tags.join(", ")}`);
          return lines.join("\n");
        })
        .join("\n");
      return `## ${section.title} [${section.kind}]\n${items || "  (empty)"}`;
    })
    .join("\n\n");

  const summary = resume.basics.summary
    ? `\nSummary: ${resume.basics.summary}\n`
    : "\n";

  return `${header}${summary}\n${body}`;
}
