"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { company, project } from "@/lib/db/schema";
import { ownerId } from "@/lib/auth/scope";

/**
 * Managing the places work happens.
 *
 * Same two invariants as everywhere else: the owner comes from the session
 * rather than the form, and updates and deletes carry it in the WHERE clause,
 * so a guessed id touches nothing.
 */

export interface CareerFormState {
  error?: string;
  ok?: boolean;
}

const KINDS = ["employer", "client", "education", "personal"] as const;

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .or(z.literal("").transform(() => undefined));

const orgSchema = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(160),
  kind: z.enum(KINDS),
  role: z.string().trim().max(160).optional(),
  isCurrent: z.boolean(),
  startDate: optionalDate,
  endDate: optionalDate,
  notes: z.string().trim().max(2000).optional(),
});

function str(f: FormData, k: string): string {
  const v = f.get(k);
  return typeof v === "string" ? v.trim() : "";
}

function parseOrg(formData: FormData) {
  return orgSchema.safeParse({
    name: str(formData, "name"),
    kind: str(formData, "kind") || "employer",
    role: str(formData, "role") || undefined,
    isCurrent: formData.get("isCurrent") === "on",
    startDate: str(formData, "startDate"),
    endDate: str(formData, "endDate"),
    notes: str(formData, "notes") || undefined,
  });
}

export async function saveOrgAction(
  _prev: CareerFormState,
  formData: FormData,
): Promise<CareerFormState> {
  const parsed = parseOrg(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const owner = await ownerId();
  const db = getDb();
  const id = str(formData, "id");

  try {
    if (id) {
      await db
        .update(company)
        .set(parsed.data)
        .where(and(eq(company.id, id), eq(company.ownerId, owner)));
    } else {
      await db.insert(company).values({ ...parsed.data, ownerId: owner });
    }
  } catch (error) {
    // company_owner_name_idx — one name per person.
    if (/unique|duplicate/i.test(String(error))) {
      return { error: `You already have one called “${parsed.data.name}”.` };
    }
    throw error;
  }

  revalidatePath("/settings");
  revalidatePath("/journal");
  return { ok: true };
}

export async function deleteOrgAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const owner = await ownerId();
  const db = getDb();

  // Entries keep existing — company_id is ON DELETE SET NULL, so deleting an
  // employer turns its entries personal rather than destroying career history.
  await db
    .delete(company)
    .where(and(eq(company.id, id), eq(company.ownerId, owner)));

  revalidatePath("/settings");
  revalidatePath("/journal");
}

/** Marks one org current. Others are left alone — contracting two places at once is normal. */
export async function toggleCurrentAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "") === "1";
  const owner = await ownerId();
  const db = getDb();

  await db
    .update(company)
    .set({ isCurrent: next })
    .where(and(eq(company.id, id), eq(company.ownerId, owner)));

  revalidatePath("/settings");
  revalidatePath("/journal");
}

const projectSchema = z.object({
  name: z.string().trim().min(1, "Give the project a name.").max(160),
  companyId: z.uuid().optional(),
  description: z.string().trim().max(2000).optional(),
  startDate: optionalDate,
  endDate: optionalDate,
});

export async function saveProjectAction(
  _prev: CareerFormState,
  formData: FormData,
): Promise<CareerFormState> {
  const companyId = str(formData, "companyId");
  const parsed = projectSchema.safeParse({
    name: str(formData, "name"),
    companyId: companyId || undefined,
    description: str(formData, "description") || undefined,
    startDate: str(formData, "startDate"),
    endDate: str(formData, "endDate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const owner = await ownerId();
  const db = getDb();
  const id = str(formData, "id");

  if (id) {
    await db
      .update(project)
      .set(parsed.data)
      .where(and(eq(project.id, id), eq(project.ownerId, owner)));
  } else {
    await db.insert(project).values({ ...parsed.data, ownerId: owner });
  }

  revalidatePath("/settings");
  revalidatePath("/journal");
  return { ok: true };
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const owner = await ownerId();
  const db = getDb();

  await db
    .delete(project)
    .where(and(eq(project.id, id), eq(project.ownerId, owner)));

  revalidatePath("/settings");
  revalidatePath("/journal");
}
