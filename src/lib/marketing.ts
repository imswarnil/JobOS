import {
  Bot,
  Braces,
  Database,
  FileText,
  Palette,
  ShieldCheck,
  Sparkles,
  Triangle,
  type LucideIcon,
} from "lucide-react";

/**
 * The homepage, as data.
 *
 * Kept out of the page component so the copy can be edited without reading
 * JSX, and so the same facts can be reused elsewhere (the auth aside already
 * shares the phase list from lib/phases.ts).
 */

export interface Pillar {
  n: string;
  title: string;
  body: string;
  phase: string;
}

export const PILLARS: Pillar[] = [
  {
    n: "01",
    title: "Log it while you remember it",
    body: "Six kinds of entry — what you shipped, what you learned, the wall you hit, the trick worth keeping, what went badly, what went well. A company is optional on every one, because plenty of what makes you better happens on a Sunday.",
    phase: "Phase 1",
  },
  {
    n: "02",
    title: "The record becomes the resume",
    body: "A structured master resume you edit in the browser and export as an ATS-friendly PDF — built from entries you actually wrote, not from a blank page at 11pm.",
    phase: "Phase 2",
  },
  {
    n: "03",
    title: "Tailored to the role, still true",
    body: "Paste a job description and the model reshapes the resume to match it, drawing only on real entries. Where the posting wants something your record cannot support, it tells you instead of inventing it.",
    phase: "Phase 3",
  },
  {
    n: "04",
    title: "The search runs itself",
    body: "Matching roles arrive from public job APIs, ranked against your actual history, each with a tailored resume ready for review — and every application tracked through to its outcome.",
    phase: "Phase 4–5",
  },
];

export interface Tool {
  name: string;
  role: string;
  icon: LucideIcon;
  why: string;
}

/** The stack, and the honest reason for each choice. */
export const TOOLS: Tool[] = [
  {
    name: "Next.js",
    role: "App Router, React 19",
    icon: Triangle,
    why: "Server components mean the database query and the markup live in the same file. Less plumbing to get wrong.",
  },
  {
    name: "Neon Postgres",
    role: "Database",
    icon: Database,
    why: "Serverless Postgres that scales to zero. Branching means a migration can be tested on real-shaped data before it touches production.",
  },
  {
    name: "Neon Auth",
    role: "Accounts and sessions",
    icon: ShieldCheck,
    why: "Better Auth, hosted by Neon, writing into the same database. Identity is a table I can join against, so ownership is a foreign key rather than an API call.",
  },
  {
    name: "Drizzle ORM",
    role: "Schema and queries",
    icon: Braces,
    why: "The schema is TypeScript, the migrations are readable SQL, and a wrong column name is a compile error rather than a 2am page.",
  },
  {
    name: "Tailwind CSS",
    role: "Styling",
    icon: Palette,
    why: "Layered over my own design system rather than a component library, so the whole product shares one palette and one type scale.",
  },
  {
    name: "Gemini + Groq",
    role: "Tailoring",
    icon: Bot,
    why: "Gemini's free tier does the work; Groq catches the rate limits. Both sit behind one interface, so swapping either is a config change.",
  },
  {
    name: "React PDF",
    role: "Resume export",
    icon: FileText,
    why: "The ATS template is JSX, so the on-screen preview and the exported file cannot drift apart.",
  },
  {
    name: "Vercel",
    role: "Hosting",
    icon: Sparkles,
    why: "Push to deploy, and the same edge runtime the Neon driver is built for.",
  },
];

/** The problem, in the first person. This is the honest bit. */
export const STORY = [
  {
    heading: "I could not remember my own work",
    body: "Two good years at a company, and when I sat down to write a resume I could recall about three things. Not because nothing happened — because nobody writes down the ordinary week, and the ordinary weeks are where most of the work lives.",
  },
  {
    heading: "So the resume got vaguer every time",
    body: "Each rewrite started from the last resume rather than from reality. Details rounded off. \"Improved performance\" replaced the night I found the query doing 1,400 lookups. The document drifted further from what I had actually done.",
  },
  {
    heading: "And I talked myself out of applying",
    body: "I once skipped a role I was qualified for because I thought I was short one bullet point. I had shipped that thing twice — just not under that name. I could not see it because I had no record to check against, only memory.",
  },
  {
    heading: "The fix is not a better template",
    body: "It is keeping the record in the first place, and then generating everything else from it. Write down one true thing a day. When you need a resume, it is already written. That is the whole idea, and everything in JobOS is downstream of it.",
  },
];
