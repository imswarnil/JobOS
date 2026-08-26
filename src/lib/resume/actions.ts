"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { resumeMaster } from "@/lib/db/schema";
import { ownerId } from "@/lib/auth/scope";
import { readResume } from "@/lib/resume/queries";
import {
  KIND_META,
  SECTION_KINDS,
  basicsSchema,
  itemSchema,
  newId,
  resumeSchema,
  type ResumeData,
  type ResumeItem,
  type SectionKind,
} from "@/lib/resume/schema";

/**
 * Every write is read-modify-write on one jsonb column.
 *
 * That is the trade for holding the document as JSON: no joins, no migration
 * when the shape moves, but no partial updates either. At one resume per
 * account and a human typing, that is the right side of the trade — and it
 * keeps every mutation below down to "load, transform, save".
 *
 * `mutate()` is the only function that touches the database, so ownership is
 * enforced in exactly one place.
 */

export interface ResumeFormState {
  error?: string;
  ok?: boolean;
}

const OK: ResumeFormState = { ok: true };

async function mutate(
  transform: (draft: ResumeData) => ResumeData,
): Promise<ResumeFormState> {
  const current = await readResume();
  if (!current) {
    return { error: "No resume yet — reload the page and try again." };
  }

  const next = resumeSchema.safeParse(transform(structuredClone(current)));
  if (!next.success) {
    return { error: next.error.issues[0].message };
  }

  const db = getDb();
  const owner = await ownerId();
  await db
    .update(resumeMaster)
    .set({ data: next.data })
    .where(eq(resumeMaster.ownerId, owner));

  revalidatePath("/resume");
  return OK;
}

/** Splits a textarea into one bullet per non-empty line. */
function parseBullets(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

function parseTags(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  return [...new Set(raw.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 40);
}

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/* ── Basics ──────────────────────────────────────────────────────────────── */

export async function saveBasicsAction(
  _prev: ResumeFormState,
  formData: FormData,
): Promise<ResumeFormState> {
  const links = [];
  // Links arrive as parallel arrays from repeated inputs.
  const labels = formData.getAll("linkLabel");
  const urls = formData.getAll("linkUrl");
  for (let i = 0; i < labels.length; i++) {
    const label = String(labels[i] ?? "").trim();
    const url = String(urls[i] ?? "").trim();
    if (label && url) links.push({ id: newId(), label, url });
  }

  const parsed = basicsSchema.safeParse({
    name: str(formData, "name"),
    headline: str(formData, "headline"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    location: str(formData, "location"),
    summary: str(formData, "summary"),
    links,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  return mutate((draft) => ({ ...draft, basics: parsed.data }));
}

/* ── Sections ────────────────────────────────────────────────────────────── */

export async function addSectionAction(
  _prev: ResumeFormState,
  formData: FormData,
): Promise<ResumeFormState> {
  const kind = str(formData, "kind") as SectionKind;
  if (!SECTION_KINDS.includes(kind)) return { error: "Pick a section type." };

  const title = str(formData, "title") || KIND_META[kind].defaultTitle;

  return mutate((draft) => {
    draft.sections.push({ id: newId(), title, kind, items: [] });
    return draft;
  });
}

export async function renameSectionAction(
  _prev: ResumeFormState,
  formData: FormData,
): Promise<ResumeFormState> {
  const id = str(formData, "sectionId");
  const title = str(formData, "title");
  if (!title) return { error: "Give this section a heading." };

  return mutate((draft) => {
    const section = draft.sections.find((s) => s.id === id);
    if (section) section.title = title;
    return draft;
  });
}

export async function deleteSectionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("sectionId") ?? "");
  await mutate((draft) => {
    draft.sections = draft.sections.filter((s) => s.id !== id);
    return draft;
  });
}

/** Reorder by one place. Order is meaning on a resume — the top is read. */
export async function moveSectionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("sectionId") ?? "");
  const dir = String(formData.get("direction") ?? "") === "up" ? -1 : 1;

  await mutate((draft) => {
    const i = draft.sections.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= draft.sections.length) return draft;
    [draft.sections[i], draft.sections[j]] = [draft.sections[j], draft.sections[i]];
    return draft;
  });
}

/* ── Items ───────────────────────────────────────────────────────────────── */

const idSchema = z.string().min(1);

export async function saveItemAction(
  _prev: ResumeFormState,
  formData: FormData,
): Promise<ResumeFormState> {
  const sectionId = str(formData, "sectionId");
  if (!idSchema.safeParse(sectionId).success) return { error: "Unknown section." };

  // Present when editing, absent when adding.
  const itemId = str(formData, "itemId");

  const parsed = itemSchema.safeParse({
    id: itemId || newId(),
    title: str(formData, "title"),
    subtitle: str(formData, "subtitle"),
    location: str(formData, "location"),
    startDate: str(formData, "startDate"),
    endDate: str(formData, "endDate"),
    current: formData.get("current") === "on",
    url: str(formData, "url"),
    bullets: parseBullets(formData.get("bullets")),
    tags: parseTags(formData.get("tags")),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const item: ResumeItem = parsed.data;

  return mutate((draft) => {
    const section = draft.sections.find((s) => s.id === sectionId);
    if (!section) return draft;

    const existing = section.items.findIndex((i) => i.id === item.id);
    if (existing >= 0) section.items[existing] = item;
    else section.items.push(item);
    return draft;
  });
}

export async function deleteItemAction(formData: FormData): Promise<void> {
  const sectionId = String(formData.get("sectionId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");

  await mutate((draft) => {
    const section = draft.sections.find((s) => s.id === sectionId);
    if (section) section.items = section.items.filter((i) => i.id !== itemId);
    return draft;
  });
}

export async function moveItemAction(formData: FormData): Promise<void> {
  const sectionId = String(formData.get("sectionId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const dir = String(formData.get("direction") ?? "") === "up" ? -1 : 1;

  await mutate((draft) => {
    const section = draft.sections.find((s) => s.id === sectionId);
    if (!section) return draft;
    const i = section.items.findIndex((it) => it.id === itemId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= section.items.length) return draft;
    [section.items[i], section.items[j]] = [section.items[j], section.items[i]];
    return draft;
  });
}
