import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { resumeMaster } from "@/lib/db/schema";
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
