"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { workLog } from "@/lib/db/schema";
import { ownerId } from "@/lib/auth/scope";

/**
 * Journal writes.
 *
 * Two invariants hold in every one of these:
 *   1. The owner comes from the session, never from the form. A client cannot
 *      write a row for somebody else by posting a different id.
 *   2. Deletes and updates carry the owner in the WHERE clause, so a guessed
 *      row id touches nothing.
 */

export interface EntryFormState {
  error?: string;
  ok?: boolean;
}

/** Splits "react, typescript , postgres" into clean, de-duplicated tags. */
function parseTags(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ].slice(0, 20);
}

/** Turns "" into undefined so optional uuid columns stay null. */
function optionalId(raw: FormDataEntryValue | null): string | undefined {
  return typeof raw === "string" && raw.trim() ? raw : undefined;
}

const entrySchema = z.object({
  type: z.enum(["work", "learning", "challenge", "trick", "setback", "win"]),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date."),
  title: z.string().trim().min(1, "Give the entry a title.").max(200),
  /** Optional: a quick log is a headline and nothing else. */
  body: z.string().trim().max(20000).optional(),
  challenges: z.string().trim().max(4000).optional(),
  impact: z.string().trim().max(4000).optional(),
  companyId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  minutesSpent: z.number().int().min(0).max(24 * 60).optional(),
});

export async function createEntryAction(
  _prev: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const minutesRaw = formData.get("minutesSpent");
  const parsed = entrySchema.safeParse({
    type: formData.get("type"),
    occurredOn: formData.get("occurredOn"),
    title: formData.get("title"),
    body: (formData.get("body") as string)?.trim() || undefined,
    challenges: (formData.get("challenges") as string)?.trim() || undefined,
    impact: (formData.get("impact") as string)?.trim() || undefined,
    companyId: optionalId(formData.get("companyId")),
    projectId: optionalId(formData.get("projectId")),
    minutesSpent:
      typeof minutesRaw === "string" && minutesRaw.trim()
        ? Number(minutesRaw)
        : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const owner = await ownerId();
  const db = getDb();

  await db.insert(workLog).values({
    ...parsed.data,
    ownerId: owner,
    techTags: parseTags(formData.get("techTags")),
    tags: parseTags(formData.get("tags")),
  });

  revalidatePath("/journal");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteEntryAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const owner = await ownerId();
  const db = getDb();

  // Owner in the WHERE clause, not just the id — a guessed uuid hits nothing.
  await db
    .delete(workLog)
    .where(and(eq(workLog.id, id), eq(workLog.ownerId, owner)));

  revalidatePath("/journal");
  revalidatePath("/dashboard");
}
