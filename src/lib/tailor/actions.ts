"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { company, resumeVersion, workLog } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { ownerId } from "@/lib/auth/scope";
import { ProviderError, completeJson } from "@/lib/llm/providers";
import {
  RateLimited,
  describeReset,
  getQuota,
  settleQuota,
  spendQuota,
} from "@/lib/llm/limit";
import { readResume } from "@/lib/resume/queries";
import { parseResume, type ResumeData } from "@/lib/resume/schema";
import {
  PARSE_SHAPE,
  PARSE_SYSTEM,
  TAILOR_SYSTEM,
  parsedJobSchema,
  tailorResultSchema,
  tailorShape,
  type ParsedJob,
  type TailorResult,
} from "@/lib/tailor/schema";
import {
  buildSourceCorpus,
  unsupportedNumbers,
  type GroundingIssue,
} from "@/lib/tailor/verify";
import { FetchPostingError, fetchPosting } from "@/lib/tailor/fetch-posting";

export interface TailorState {
  error?: string;
  rateLimited?: boolean;
  remaining?: number;
  posting?: ParsedJob;
  result?: TailorResult;
  /** Numeric claims the rewrite made that no source supports. */
  issues?: GroundingIssue[];
  /** The provider that answered, shown so the user knows what wrote this. */
  provider?: string;
  /** Set once the tailored copy has been saved as a version. */
  savedVersionId?: string;
}

/** Journal entries the rewrite is permitted to draw on. */
async function gatherJournal(owner: string) {
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
    .limit(80);
}

function journalToText(rows: Awaited<ReturnType<typeof gatherJournal>>): string {
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

/** Everything the rewrite may cite, flattened for the grounding check. */
function sourceCorpus(
  resume: ResumeData,
  rows: Awaited<ReturnType<typeof gatherJournal>>,
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

/**
 * Reads a posting and rewrites the resume against it.
 *
 * One model call does the parse and one does the rewrite, and both are spent
 * from the same quota unit — from the user's side this is a single action, and
 * charging twice for one button would be a surprise.
 */
export async function tailorAction(
  _prev: TailorState,
  formData: FormData,
): Promise<TailorState> {
  const user = await requireUser();
  const owner = user.id;

  const url = String(formData.get("url") ?? "").trim();
  let raw = String(formData.get("description") ?? "").trim();

  if (!raw && url) {
    try {
      raw = await fetchPosting(url);
    } catch (error) {
      return {
        error:
          error instanceof FetchPostingError
            ? error.message
            : "Could not read that link. Paste the description text instead.",
      };
    }
  }

  if (raw.length < 120) {
    return {
      error:
        "That is too short to work from. Paste the whole posting — responsibilities and requirements included.",
    };
  }

  const [resumeData, journal] = await Promise.all([
    readResume(),
    gatherJournal(owner),
  ]);

  const resume = resumeData ?? parseResume(null, user.name);

  if (!resume.sections.some((s) => s.items.length)) {
    return {
      error:
        "Your resume is still empty. Add some entries first — tailoring rearranges what you have, it does not invent a career.",
    };
  }

  let usageId: string;
  try {
    usageId = await spendQuota("tailor-resume");
  } catch (error) {
    if (error instanceof RateLimited) {
      return {
        rateLimited: true,
        remaining: 0,
        error: `You have used all ${error.quota.limit} of your model requests. They come back ${describeReset(error.quota)}.`,
      };
    }
    throw error;
  }

  try {
    // 1 · Understand the posting.
    const { value: posting } = await completeJson(
      {
        system: PARSE_SYSTEM,
        user: `Job posting:\n\n${raw.slice(0, 18_000)}\n\nReturn JSON in exactly this shape:\n${PARSE_SHAPE}`,
        maxTokens: 2000,
        temperature: 0.2,
      },
      (v) => parsedJobSchema.parse(v),
    );

    // 2 · Rewrite against it, from the record only.
    const { value: result, provider } = await completeJson(
      {
        system: TAILOR_SYSTEM,
        user: [
          `THE POSTING (parsed):\n${JSON.stringify(posting, null, 2)}`,
          `\nTHE CURRENT RESUME:\n${JSON.stringify(
            { basics: resume.basics, sections: resume.sections },
            null,
            2,
          )}`,
          `\nTHE WORK JOURNAL (the source of truth about what they did):\n${journalToText(journal)}`,
          `\nReturn JSON in exactly this shape:\n${tailorShape()}`,
        ].join("\n"),
        maxTokens: 6000,
        temperature: 0.4,
      },
      (v) => tailorResultSchema.parse(v),
    );

    await settleQuota(usageId, { provider, ok: true });

    // 3 · Check it did not invent numbers.
    const corpus = sourceCorpus(resume, journal);
    const issues: GroundingIssue[] = [];

    for (const section of result.sections) {
      for (const item of section.items) {
        for (const bullet of item.bullets) {
          const unsupported = unsupportedNumbers(bullet, corpus);
          if (unsupported.length) {
            issues.push({
              section: section.title,
              item: item.title,
              bullet,
              unsupported,
            });
          }
        }
      }
    }

    const quota = await getQuota();

    return { posting, result, issues, provider, remaining: quota.remaining };
  } catch (error) {
    const detail =
      error instanceof ProviderError ? error.message : (error as Error).message;

    await settleQuota(usageId, {
      provider: error instanceof ProviderError ? error.provider : "unknown",
      ok: false,
      error: detail,
    });

    return {
      error:
        "The model could not produce a usable rewrite. That is usually temporary — try again in a minute.",
    };
  }
}

/**
 * Saves a tailored rewrite as a resume version.
 *
 * A version, not the master: the tailored copy exists for one application,
 * and overwriting the master with it would gradually bend the general resume
 * towards whichever job was tailored last.
 */
export async function saveTailoredAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const payload = String(formData.get("payload") ?? "");
  const label = String(formData.get("label") ?? "").trim();

  if (!label) return { error: "Give this version a name." };

  let parsed: TailorResult;
  try {
    parsed = tailorResultSchema.parse(JSON.parse(payload));
  } catch {
    return { error: "That rewrite could not be read. Run it again." };
  }

  const current = await readResume();
  if (!current) return { error: "No resume to base this on." };

  const next: ResumeData = {
    ...current,
    basics: {
      ...current.basics,
      headline: parsed.headline || current.basics.headline,
      summary: parsed.summary || current.basics.summary,
    },
    sections: parsed.sections.length ? parsed.sections : current.sections,
  };

  const owner = await ownerId();
  const db = getDb();

  await db.insert(resumeVersion).values({ ownerId: owner, label, data: next });

  revalidatePath("/resume");
  revalidatePath("/tailor");
  return { ok: true };
}
