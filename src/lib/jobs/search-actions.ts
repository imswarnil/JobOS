"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { jobCriteria } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { ownerId } from "@/lib/auth/scope";
import { runSavedSearches, type SearchRunResult } from "@/lib/jobs/search-runner";

/**
 * Saved searches, from the UI.
 *
 * A saved search is a `job_criteria` row — see the note in `search-runner.ts`
 * for why that table rather than a new one.
 */

export interface SearchFormState {
  error?: string;
  ok?: boolean;
  result?: SearchRunResult;
}

export async function addSearchAction(
  _prev: SearchFormState,
  formData: FormData,
): Promise<SearchFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const remote = formData.get("remote") === "on";

  if (title.length < 3) {
    return { error: "Give the search a job title to look for." };
  }
  if (title.length > 120) {
    return { error: "That title is too long to search for." };
  }

  const owner = await ownerId();
  const db = getDb();

  await db.insert(jobCriteria).values({
    ownerId: owner,
    title,
    location: location || null,
    remote,
    keywords: [],
  });

  revalidatePath("/jobs");
  return { ok: true };
}

export async function deleteSearchAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const owner = await ownerId();
  const db = getDb();

  await db
    .delete(jobCriteria)
    .where(and(eq(jobCriteria.id, id), eq(jobCriteria.ownerId, owner)));

  revalidatePath("/jobs");
}

/**
 * Runs every saved search now, from the UI.
 *
 * The same work the schedule does. Exposed because waiting up to three hours
 * to find out whether a search you just added returns anything is a bad way
 * to learn that the query was wrong.
 */
export async function runSearchNowAction(
  _prev: SearchFormState,
  _formData: FormData,
): Promise<SearchFormState> {
  const user = await requireUser();

  try {
    const result = await runSavedSearches(user.id);
    revalidatePath("/jobs");
    return { ok: true, result };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
