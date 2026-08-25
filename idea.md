# Claude Code Prompt — JobOS Foundation & Skeleton

> **How to use:** Open Claude Code in an empty folder named `job.imswarnil.com`, have your Neon connection string ready, and paste everything below the line into Claude Code.

---

You are setting up the foundation for a personal side project called **JobOS** that I want to be able to grow into a SaaS product later. Do **only** the foundation and skeleton described here — do not build full feature logic yet. Work carefully, explain your plan before large changes, and verify the project builds and boots at the end.

## Project abstract (formalize this into `docs/ABSTRACT.md`)

JobOS is a career operating system. It has four pillars, built in phases:

1. **Work Journal** — log daily work (company, project, tasks, challenges, tech used, impact). This is the source-of-truth career history.
2. **Resume Builder** — maintain a structured master resume, edit in-browser, export an ATS-friendly PDF.
3. **JD-Tailored Resume** — paste a job description/URL; an LLM rewrites the resume to match, using only real facts from my journal.
4. **Job Agent** — discover matching jobs via legitimate job APIs, auto-tailor resumes, assist with applying, and track every application.

It runs today as a free, single-user app, but must be architected so it can later become multi-user SaaS with minimal rework.

## Tech stack (use current stable versions — resolve latest at install time, do not pin to old versions)

- **Next.js** (App Router) + **TypeScript**, `src/` directory
- **Tailwind CSS** + **shadcn/ui** for the design system
- **Drizzle ORM** + **@neondatabase/serverless** (database is **Neon** Postgres)
- **Auth.js / NextAuth** with the Drizzle adapter — email/OAuth login, sessions, protected routes
- **Zod** + **React Hook Form** for validation and forms
- Package manager: **pnpm** (fall back to npm if unavailable)
- Deployment target: **Vercel** (make it Vercel-ready)

## SaaS-readiness rules (important — follow these now, not later)

1. Every domain table has an **`owner_id`** foreign key to `users.id`, set from day one. I am the only user now, but nothing should assume single-user.
2. All database reads/writes for domain data must be **scoped by the current user's id**. Create a small helper (e.g. `getCurrentUser()` / a scoped query pattern) and use it everywhere.
3. Leave a **documented extension point** for a future `organization_id` / teams layer (a comment + a note in the roadmap), but do **not** build orgs yet.
4. Keep code **modular** so features are self-contained and easy to extend: separate `lib/` (db, auth, llm, jobs) from `features/` or route modules.
5. Type-safe end to end. Validate all inputs with Zod.

## Scope for THIS session — Phase 0 only

Build the skeleton, not the features:

### 1. Project scaffold
- Initialize Next.js (App Router, TS, Tailwind, ESLint, `src/`).
- Add and configure shadcn/ui with a clean neutral base theme and dark-mode support.
- Set up Drizzle + Neon driver, `drizzle.config.ts`, and a `lib/db/index.ts` client.
- Set up Auth.js with the Drizzle adapter: a working sign-in page (email magic link **or** Google OAuth — pick whichever needs least config, and stub the other), session handling, and route protection for the app area.

### 2. Database schema (define in Drizzle; generate a migration but do NOT run it against a live DB)
- **Auth tables** required by the Auth.js Drizzle adapter (`users`, `accounts`, `sessions`, `verification_tokens`).
- **Domain tables** (columns defined, `owner_id` FK + `created_at`/`updated_at` on each):
  - `company` (name, notes)
  - `project` (company_id, name, description, start_date, end_date)
  - `work_log` (date, company_id, project_id, tasks, challenges, tech_tags[], impact, tags[], minutes_spent)
  - `resume_master` (data jsonb)
  - `resume_version` (job_id nullable, data jsonb, label)
  - `job_criteria` (title, keywords[], location, remote, min_salary, seniority)
  - `job` (source, external_id, title, company, url, description, posted_at, match_score, status)
  - `application` (job_id, resume_version_id, status, applied_at, notes)
- Add a `status` enum: `found | tailored | applied | interview | offer | rejected | skipped`.
- Run `drizzle-kit generate` to produce the migration SQL. In the README, tell me the exact command to apply it once I add my Neon URL.

### 3. App skeleton (UI)
- A `(auth)` route group with the sign-in page.
- A protected `(app)` route group with a shared layout: a sidebar nav linking to **Dashboard, Journal, Resume, Jobs, Applications, Settings**, plus a user menu with sign-out.
- A placeholder page for each of those routes: a heading, one-line description, and a small "Coming in Phase X" badge (Journal→P1, Resume→P2, JD tailoring lives under Resume→P3, Jobs→P4, Applications→P4/P5, Settings→now).
- The Dashboard shows a simple welcome + the phase roadmap.
- Make it responsive and clean; this is the real shell, not a throwaway.

### 4. Stubs for future phases (interfaces + TODOs, no real logic)
- `lib/llm/` — a provider interface with `tailorResume()` / `parseJobDescription()` signatures and TODO comments. Note in comments: primary provider = **Google Gemini** free tier, fallback = **Groq**. Read keys from env.
- `lib/jobs/` — a `JobSource` interface and empty connector stubs for `greenhouse`, `lever`, `adzuna` with TODOs. Note: discovery uses legitimate public job APIs, not scraping.
- `lib/resume/` — a `generatePdf()` stub with a TODO.

### 5. Config & docs
- `.env.example` with: `DATABASE_URL` (Neon), `AUTH_SECRET`, auth provider vars, `GEMINI_API_KEY`, `GROQ_API_KEY`, `ADZUNA_APP_ID`/`ADZUNA_APP_KEY`. Never commit real secrets; ensure `.env*` is gitignored.
- `docs/ABSTRACT.md` — the abstract above, cleaned up.
- `docs/ROADMAP.md` — the phases below, as a checklist.
- `README.md` — what JobOS is, the stack, folder structure, and step-by-step: install deps → set env → generate/apply migration → run dev → deploy to Vercel.
- Initialize a git repo with a sensible `.gitignore` and make one initial commit.

## Phase roadmap (put in `docs/ROADMAP.md`)

- **Phase 0 — Foundation & skeleton** ← this session
- **Phase 1 — Work Journal** (log CRUD, companies/projects, timeline, filters, search)
- **Phase 2 — Resume Builder** (master resume editor, ATS template, PDF export, versions)
- **Phase 3 — JD-Tailored Resume** (Gemini: parse JD + rewrite resume from real facts)
- **Phase 4 — Job Discovery + Tracker** (public job APIs, ranking, pipeline board)
- **Phase 5 — Job Agent, assisted apply** (auto-tailor top matches, GitHub Actions cron)
- **Phase 6 — Stretch** (experimental autonomous apply + SaaS multi-tenancy: organizations, billing)

## Constraints

- Do **not** implement LLM calls, PDF generation, scraping, or feature CRUD yet — stubs and placeholders only.
- Do **not** run migrations against a live database (I'll add my Neon URL myself).
- Do **not** commit secrets.
- Prefer server components and server actions; keep client components minimal.
- Leave clear `// TODO(Phase N):` markers wherever future work plugs in.

## Finish by

1. Running the build and starting the dev server to confirm the app boots and the sign-in + protected shell work (with a note if auth needs my env vars to fully test).
2. Printing a short summary: what you created, the folder structure, the exact commands I run next (env → migrate → dev), and what Phase 1 will add.