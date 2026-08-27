/**
 * The build plan, as data.
 *
 * The sidebar badges, the dashboard roadmap and every "Coming in Phase N"
 * placeholder all read from here — so shipping a phase means flipping one
 * `status` field, not hunting through templates.
 */

export type PhaseId = "P0" | "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
export type PhaseStatus = "shipped" | "building" | "planned";

export interface Phase {
  id: PhaseId;
  title: string;
  summary: string;
  status: PhaseStatus;
  /** What lands when this phase is done — rendered as the roadmap checklist. */
  deliverables: string[];
}

export const PHASES: Phase[] = [
  {
    id: "P0",
    title: "Foundation & skeleton",
    summary:
      "The shell: design language, navigation, placeholder screens, database schema and the seams that later phases plug into.",
    status: "shipped",
    deliverables: [
      "Frame & Signal design language on Figtree, light + dark",
      "App shell: sidebar, topbar, command bar, user menu",
      "Placeholder screen for every route",
      "Login and sign-up UI (unwired)",
      "Drizzle schema with owner_id on every domain table",
      "Provider stubs for LLM, job sources and PDF export",
    ],
  },
  {
    id: "P1",
    title: "Work Journal",
    summary:
      "Log daily work — and everything around it. Six kinds of entry, a company optional on all of them, because plenty of what makes you better happens nowhere near an employer.",
    status: "building",
    deliverables: [
      "Neon Auth: real accounts, sessions and sign-out",
      "Six log types: work, learning, challenge, trick, setback, win",
      "Quick composer — a type and one line is a complete entry",
      "List, calendar and board views",
      "Filter by kind and search, with live counts",
      "Career setup: employers, clients, courses and projects",
      "Export everything as JSON",
      "Streaks and weekly counts on the dashboard",
      "Installable as a PWA, with an offline fallback",
    ],
  },
  {
    id: "P2",
    title: "Resume Builder",
    summary:
      "A structured master resume you edit in the browser and export as an ATS-friendly PDF. Sections are yours to invent — the app decides how entries render, not what they are called.",
    status: "building",
    deliverables: [
      "Master resume editor with a live document preview",
      "Sections you can add, rename, reorder and delete",
      "Five section kinds: experience, education, projects, skills, custom",
      "ATS-safe template — one column, real text, standard headings",
      "Three layouts, and a header you arrange yourself",
      "Named versions you can preview and restore",
      "PDF export from the same DOM as the preview",
    ],
  },
  {
    id: "P3",
    title: "JD-tailored resume",
    summary:
      "Paste a job description; the model rewrites your resume to match it — using only real facts drawn from your journal.",
    status: "building",
    deliverables: [
      "Job-description parsing, from pasted text or a link",
      "Fact-grounded rewrite from your resume and journal only",
      "A grounding check that flags numbers no source supports",
      "An honest gap report and a match score",
      "Saved as a version, never over the master",
      "Gemini, Groq or a self-hosted Ollama",
    ],
  },
  {
    id: "P4",
    title: "Job discovery & tracker",
    summary:
      "Pull matching roles from legitimate public job APIs, rank them, and track every application through a pipeline.",
    status: "planned",
    deliverables: [
      "Greenhouse, Lever and Adzuna connectors",
      "Saved search criteria",
      "Match scoring",
      "Pipeline board from found to offer",
    ],
  },
  {
    id: "P5",
    title: "Job agent",
    summary:
      "A scheduled agent that finds the day's best matches, tailors a resume for each, and queues them for your review.",
    status: "planned",
    deliverables: [
      "Scheduled discovery run",
      "Auto-tailoring for top matches",
      "Assisted apply with a review step",
      "Digest notifications",
    ],
  },
  {
    id: "P6",
    title: "Stretch",
    summary:
      "Experimental autonomous apply, and the multi-tenant layer that turns JobOS into a product other people can use.",
    status: "planned",
    deliverables: [
      "Organizations and teams",
      "Billing and plans",
      "Autonomous apply experiments",
      "Public API",
    ],
  },
];

export const PHASE_BY_ID = Object.fromEntries(
  PHASES.map((p) => [p.id, p]),
) as Record<PhaseId, Phase>;
