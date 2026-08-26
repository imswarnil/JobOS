# JobOS — roadmap

Each phase is useful on its own. Nothing is a prerequisite for using what came
before it.

The canonical version of this list lives in `src/lib/phases.ts` — the sidebar
badges, the dashboard roadmap and every placeholder screen render from it.
Update that file and this one together.

---

## Phase 0 — Foundation & skeleton ✅ shipped

The shell, the design language, and the seams every later phase plugs into.

- [x] Next.js App Router + TypeScript + Tailwind v4, `src/` layout
- [x] Frame & Signal design language on Figtree, light + dark, no flash on load
- [x] App shell: career-grouped sidebar, topbar, user menu, mobile drawer
- [x] A placeholder screen for every route, generated from the phase data
- [x] Login and sign-up UI (rendered, deliberately unwired)
- [x] Settings and Admin screens
- [x] Drizzle schema — 8 domain tables, `owner_id` + timestamps on every one
- [x] Migration generated (not applied)
- [x] `getCurrentUser()` / `scope()` seam, used by every screen
- [x] Provider stubs: LLM, job sources, PDF export
- [x] `.env.example`, docs, README

## Phase 1 — Work Journal `in progress`

- [x] Neon Auth enabled; real accounts, sessions and sign-out
- [x] Migration applied; `owner_id` foreign keys to `neon_auth.user`
- [x] `requireUser()` redirects — every `(app)` route is gated
- [x] Six log types: work, learning, challenge, trick, setback, win
- [x] A company is optional on every entry — personal logs are first-class
- [x] Entry composer with a prompt per type
- [x] Filter by kind, with counts, in the URL
- [x] Create and delete, as server actions
- [x] Streaks and weekly counts on the dashboard (streak computed in SQL)
- [x] Seeded demo account with 15 entries across all six types
- [x] Public homepage
- [x] Edit your profile name from Settings
- [ ] Edit an existing entry
- [x] Search across title, body and impact, held in the URL
- [x] Career setup: employers, clients, courses and projects
- [x] Calendar and board views alongside the list
- [x] Quick composer — a type and one line is a complete entry
- [x] Collapsible sidebar, motion system, installable PWA
- [ ] Weekly summary digest
- [x] Export everything as JSON from Settings

## Phase 2 — Resume Builder `in progress`

- [x] `ResumeData` Zod schema over `resume_master.data`
- [x] Master resume created on first visit, seeded from the profile
- [x] Header editor — name, headline, contact, summary, labelled links
- [x] Sections: add, rename, reorder, delete
- [x] Five section kinds — experience, education, projects, skills, custom —
      where the kind decides rendering and the heading is yours to name
- [x] Entries: add, edit, reorder, delete, with per-kind fields
- [x] Live preview of the ATS-safe document beside the editor
- [x] Demo account ships with a populated resume
- [x] Three layouts and an arrangeable header
- [x] Named versions — save, preview, restore
- [x] PDF export — the browser prints the same DOM as the preview, so the
      two cannot drift; page-break rules keep a role with its bullets
- [x] Download any saved version as a PDF without restoring it first
- [x] Collapsible sections, and editor panels that resync with the server
- [ ] Generate bullets from journal entries

## Phase 3 — JD-tailored resume

- [x] Gemini provider (primary), Groq provider (fallback), with JSON
      validation inside the fallback chain
- [x] Per-user rate limiting (5 per rolling 24h) backed by an ledger table
- [x] "Define my role" — names your job title from your own entries
- [ ] Job description parsing into structured fields
- [ ] Fact-grounded rewrite — journal entries as the only permitted source
- [ ] Diff against the master resume
- [ ] Gap report: what the posting wants that the record cannot support
- [ ] Per-application resume versions

## Phase 4 — Job discovery & tracker

- [ ] Greenhouse and Lever connectors, plus a company watchlist
- [ ] Adzuna connector
- [ ] Saved search criteria
- [ ] De-duplication and match scoring
- [ ] Pipeline board: found → tailored → applied → interview → offer
- [ ] Real counts in the sidebar pipeline meter

## Phase 5 — Job agent

- [ ] Scheduled discovery run (GitHub Actions cron or a Vercel cron)
- [ ] Auto-tailoring for top matches
- [ ] Assisted apply, always with a human review step
- [ ] Digest notifications

## Phase 6 — Stretch

- [ ] Organizations and teams — Neon Auth already ships the Better Auth
      organization plugin (`neon_auth.organization` / `member` exist and are
      enabled), so this is reading a tenancy layer that is already there:
      widen `scope()` to return `organizationId` from
      `session.activeOrganizationId`
- [ ] Role checks — `neon_auth.user.role` exists and `CurrentUser.role`
      already reads it; the Admin screen gate is one line
- [ ] Billing and plans
- [ ] Autonomous apply experiments
- [ ] Public API
