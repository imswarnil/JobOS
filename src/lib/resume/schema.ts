import { z } from "zod";

/**
 * THE RESUME DOCUMENT
 * ===================
 *
 * Held as jsonb in `resume_master.data` rather than shredded across tables.
 * The shape changes every time the template does, and a jsonb column absorbs
 * that without a migration — so validation has to happen here instead, at the
 * edge, on the way in and on the way out.
 *
 * Everything is a **section of items**. Experience, education, projects and
 * skills are not different structures — they are the same structure rendered
 * differently, which is what lets you add a section the author invents
 * ("Speaking", "Certifications", "Open source") without new code.
 *
 * `kind` only decides presentation:
 *   experience  dates and a subtitle carry weight; bullets are the substance
 *   education   same shape, tighter
 *   projects    a link matters more than dates
 *   skills      tags render inline as a list, bullets are ignored
 *   custom      prose: title, bullets, nothing assumed
 */

export const SECTION_KINDS = [
  "experience",
  "education",
  "projects",
  "skills",
  "custom",
] as const;

export type SectionKind = (typeof SECTION_KINDS)[number];

export const linkSchema = z.object({
  id: z.string(),
  label: z.string().trim().min(1).max(60),
  url: z.string().trim().min(1).max(300),
});

/**
 * How the document is laid out.
 *
 * All three are single-column and ATS-safe — the choice is about density and
 * emphasis, not about structure. A two-column layout is the one thing a
 * resume builder must not offer, because parsers read the columns
 * interleaved and the resume arrives as nonsense.
 *
 *   classic   serif, centred header, generous — the default
 *   modern    sans, left-aligned header, tighter rules
 *   compact   same as modern with the leading pulled in, for long careers
 */
export const LAYOUTS = ["classic", "modern", "compact"] as const;
export type ResumeLayout = (typeof LAYOUTS)[number];

/** The header fields, in the order the author wants them. */
export const HEADER_FIELDS = ["email", "phone", "location", "links"] as const;
export type HeaderField = (typeof HEADER_FIELDS)[number];

export const layoutSchema = z.object({
  style: z.enum(LAYOUTS).default("classic"),
  /**
   * Which details appear under the name, and in what order. Anything omitted
   * is simply left out — some people do not want a phone number on a document
   * they hand to strangers.
   */
  header: z.array(z.enum(HEADER_FIELDS)).max(4).default([...HEADER_FIELDS]),
  /** Show the summary paragraph at all. */
  showSummary: z.boolean().default(true),
});

export type ResumeLayoutConfig = z.infer<typeof layoutSchema>;

export const LAYOUT_META: Record<
  ResumeLayout,
  { label: string; hint: string }
> = {
  classic: {
    label: "Classic",
    hint: "Serif, centred name, generous spacing. Reads like a document.",
  },
  modern: {
    label: "Modern",
    hint: "Sans-serif, left-aligned, tighter rules.",
  },
  compact: {
    label: "Compact",
    hint: "Modern with the leading pulled in — for a long career on one page.",
  },
};

export const HEADER_FIELD_META: Record<HeaderField, string> = {
  email: "Email",
  phone: "Phone",
  location: "Location",
  links: "Links",
};

export const basicsSchema = z.object({
  name: z.string().trim().max(120).default(""),
  /** The one line under the name. "Senior Backend Engineer", not an objective. */
  headline: z.string().trim().max(160).default(""),
  email: z.string().trim().max(160).default(""),
  phone: z.string().trim().max(60).default(""),
  location: z.string().trim().max(120).default(""),
  /**
   * A short paragraph. Optional and deliberately capped — a summary that runs
   * long is the first thing a reader skips.
   */
  summary: z.string().trim().max(800).default(""),
  links: z.array(linkSchema).max(6).default([]),
});

export const itemSchema = z.object({
  id: z.string(),
  /** Role, degree, project name. The bold line. */
  title: z.string().trim().min(1, "Give this entry a title.").max(160),
  /** Employer, institution, client. The line under it. */
  subtitle: z.string().trim().max(160).default(""),
  location: z.string().trim().max(120).default(""),
  /** Free text, not a date input: "Mar 2024", "2019", "Summer 2021". */
  startDate: z.string().trim().max(40).default(""),
  endDate: z.string().trim().max(40).default(""),
  /** When true the end date renders as "Present" and endDate is ignored. */
  current: z.boolean().default(false),
  url: z.string().trim().max(300).default(""),
  /** One achievement each. The unit an ATS and a human both read. */
  bullets: z.array(z.string().trim().max(600)).max(12).default([]),
  /** Used by `skills` sections; ignored elsewhere. */
  tags: z.array(z.string().trim().max(40)).max(40).default([]),
});

export const sectionSchema = z.object({
  id: z.string(),
  /**
   * Standard headings parse best — "Experience", "Education", "Skills". A
   * clever name is the fastest way to have a section ignored entirely.
   */
  title: z.string().trim().min(1, "Give this section a heading.").max(80),
  kind: z.enum(SECTION_KINDS),
  items: z.array(itemSchema).max(50).default([]),
});

export const resumeSchema = z.object({
  basics: basicsSchema,
  sections: z.array(sectionSchema).max(20).default([]),
  /**
   * Optional so every document stored before layouts existed still parses —
   * `parseResume` fills the default rather than discarding the resume.
   */
  layout: layoutSchema.default({
    style: "classic",
    header: [...HEADER_FIELDS],
    showSummary: true,
  }),
});

export type ResumeLink = z.infer<typeof linkSchema>;
export type ResumeBasics = z.infer<typeof basicsSchema>;
export type ResumeItem = z.infer<typeof itemSchema>;
export type ResumeSection = z.infer<typeof sectionSchema>;
export type ResumeData = z.infer<typeof resumeSchema>;

/** Presentation metadata for each kind — labels the editor uses. */
export const KIND_META: Record<
  SectionKind,
  { label: string; itemNoun: string; hint: string; defaultTitle: string }
> = {
  experience: {
    label: "Experience",
    itemNoun: "role",
    hint: "Roles and what changed because you were there.",
    defaultTitle: "Experience",
  },
  education: {
    label: "Education",
    itemNoun: "qualification",
    hint: "Degrees, courses, certifications.",
    defaultTitle: "Education",
  },
  projects: {
    label: "Projects",
    itemNoun: "project",
    hint: "Things you built. A link matters more than dates here.",
    defaultTitle: "Projects",
  },
  skills: {
    label: "Skills",
    itemNoun: "group",
    hint: "Grouped lists — “Languages”, “Infrastructure”. Tags, not bullets.",
    defaultTitle: "Skills",
  },
  custom: {
    label: "Custom",
    itemNoun: "entry",
    hint: "Anything else — speaking, publications, volunteering.",
    defaultTitle: "Section",
  },
};

/**
 * A new resume is not empty — it is scaffolded with the three sections every
 * resume has, in the order they are conventionally read. An empty page is a
 * harder thing to start than a page with the right holes in it.
 */
export function emptyResume(name = "", email = ""): ResumeData {
  return {
    basics: {
      name,
      headline: "",
      email,
      phone: "",
      location: "",
      summary: "",
      links: [],
    },
    sections: [
      { id: newId(), title: "Experience", kind: "experience", items: [] },
      { id: newId(), title: "Education", kind: "education", items: [] },
      { id: newId(), title: "Skills", kind: "skills", items: [] },
    ],
    layout: {
      style: "classic",
      header: [...HEADER_FIELDS],
      showSummary: true,
    },
  };
}

export function newId(): string {
  return crypto.randomUUID();
}

/**
 * Parses whatever is in the database into a valid document.
 *
 * Never throws: a resume that fails to parse — because the shape moved on, or
 * because a hand-edited row is malformed — must not take the page down. The
 * caller gets a usable empty document instead, and the stored row is
 * overwritten on the next save.
 */
export function parseResume(value: unknown, fallbackName = ""): ResumeData {
  const parsed = resumeSchema.safeParse(value);
  return parsed.success ? parsed.data : emptyResume(fallbackName);
}

/** "Mar 2024 — Present", collapsing gracefully when either half is missing. */
export function formatRange(item: ResumeItem): string {
  const end = item.current ? "Present" : item.endDate;
  if (item.startDate && end) return `${item.startDate} — ${end}`;
  return item.startDate || end || "";
}
