import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { resumeMaster, resumeVersion } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { ownerId } from "@/lib/auth/scope";
import { emptyResume, parseResume, type ResumeData } from "@/lib/resume/schema";

/**
 * Loads the owner's master resume, creating it on first visit.
 *
 * There is exactly one per account (`resume_master_owner_idx` is unique), so
 * "create a resume" is not a thing the user does — it already exists the
 * moment they open the page, scaffolded from their profile. Named variants
 * tailored to a role are `resume_version` rows, which arrive in Phase 3.
 */
export async function getOrCreateResume(): Promise<{
  id: string;
  data: ResumeData;
  updatedAt: Date;
}> {
  const db = getDb();
  const user = await requireUser();
  const owner = user.id;

  const [existing] = await db
    .select()
    .from(resumeMaster)
    .where(eq(resumeMaster.ownerId, owner))
    .limit(1);

  if (existing) {
    return {
      id: existing.id,
      data: parseResume(existing.data, user.name),
      updatedAt: existing.updatedAt,
    };
  }

  const seeded = emptyResume(user.name, user.email);
  const [created] = await db
    .insert(resumeMaster)
    .values({ ownerId: owner, data: seeded })
    .returning();

  return { id: created.id, data: seeded, updatedAt: created.updatedAt };
}

/** The stored document, or null. Used by writers that must not create rows. */
export async function readResume(): Promise<ResumeData | null> {
  const db = getDb();
  const owner = await ownerId();

  const [row] = await db
    .select({ data: resumeMaster.data })
    .from(resumeMaster)
    .where(eq(resumeMaster.ownerId, owner))
    .limit(1);

  return row ? parseResume(row.data) : null;
}

/**
 * Saved versions, newest first.
 *
 * The full `data` blob is deliberately not selected: the list only needs
 * labels and dates, and a page of resumes is a lot of jsonb to drag across the
 * wire to render a row of names.
 */
export async function listVersions() {
  const db = getDb();
  const owner = await ownerId();

  return db
    .select({
      id: resumeVersion.id,
      label: resumeVersion.label,
      jobId: resumeVersion.jobId,
      createdAt: resumeVersion.createdAt,
      updatedAt: resumeVersion.updatedAt,
    })
    .from(resumeVersion)
    .where(eq(resumeVersion.ownerId, owner))
    .orderBy(desc(resumeVersion.createdAt))
    .limit(50);
}

export type ResumeVersionRow = Awaited<ReturnType<typeof listVersions>>[number];

/** One version's document, or null if it is not yours. */
export async function readVersion(id: string): Promise<{
  label: string;
  data: ResumeData;
} | null> {
  const db = getDb();
  const owner = await ownerId();

  const [row] = await db
    .select({ label: resumeVersion.label, data: resumeVersion.data })
    .from(resumeVersion)
    .where(and(eq(resumeVersion.id, id), eq(resumeVersion.ownerId, owner)))
    .limit(1);

  return row ? { label: row.label, data: parseResume(row.data) } : null;
}
