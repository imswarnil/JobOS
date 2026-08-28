"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { applicationStatus, job } from "@/lib/db/schema";
import { ownerId } from "@/lib/auth/scope";
import type { ApplicationStatus } from "@/lib/db/schema";

/**
 * MOVING A POSTING THROUGH THE PIPELINE
 * =====================================
 *
 * The only writes JobOS makes to `job` from a session. Discovery's writes come
 * in through `/api/ingest/jobs` on a token, and the two must not blur: that
 * endpoint is explicitly forbidden from overwriting `status`, precisely so
 * that a crawler seeing a posting again cannot undo the decision made here.
 *
 * Every statement carries the owner in the WHERE clause rather than trusting
 * that the id came from a list the owner was shown.
 */

export interface JobActionState {
  error?: string;
  ok?: boolean;
}

const VALID = new Set<string>(applicationStatus.enumValues);

export async function setJobStatusAction(
  formData: FormData,
): Promise<void> {
  const id = String(formData.get("jobId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !VALID.has(status)) return;

  const owner = await ownerId();
  const db = getDb();

  await db
    .update(job)
    .set({ status: status as ApplicationStatus })
    .where(and(eq(job.id, id), eq(job.ownerId, owner)));

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
}

/**
 * Removes a posting outright.
 *
 * Distinct from `skipped`, which is a decision worth remembering — discovery
 * re-imports on a unique index, so a skipped row stays and stays skipped,
 * whereas a deleted one will simply be found again on the next run. Deleting
 * is therefore for junk that should never have been imported, not for "no
 * thanks".
 */
export async function deleteJobAction(formData: FormData): Promise<void> {
  const id = String(formData.get("jobId") ?? "");
  if (!id) return;

  const owner = await ownerId();
  const db = getDb();

  await db.delete(job).where(and(eq(job.id, id), eq(job.ownerId, owner)));

  revalidatePath("/jobs");
}
