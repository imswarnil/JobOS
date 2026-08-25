# JobOS — roadmap

Each phase is useful on its own. Nothing is a prerequisite for using what came
before it.

The canonical version of this list lives in `src/lib/phases.ts` — the sidebar
badges, the dashboard roadmap and every placeholder screen render from it.
Update that file and this one together.

---

## Phase 0 — Foundation & skeleton `in progress`

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

## Phase 1 — Work Journal

- [ ] Turn on Neon Auth; replace the placeholder in `lib/auth/index.ts`
- [ ] Apply the migration; add the `owner_id` foreign keys (see `DATABASE.md`)
- [ ] Make `requireUser()` an actual redirect
- [ ] Work log CRUD — tasks, challenges, tech, impact, minutes
- [ ] Companies and projects
- [ ] Timeline view with filters and full-text search
- [ ] Streaks and weekly summaries on the dashboard
- [ ] Export everything as JSON from Settings

## Phase 2 — Resume Builder

- [ ] `ResumeData` Zod schema, mirrored onto `resume_master.data`
- [ ] Master resume editor
- [ ] ATS-safe template: one column, real text, standard headings
- [ ] PDF export via React-PDF
- [ ] Named versions and history

## Phase 3 — JD-tailored resume

- [ ] Gemini provider (primary), Groq provider (fallback)
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

- [ ] Organizations and teams — add `organization_id` to the shared `ownership`
      column set in `schema.ts`, and widen `scope()` to return it
- [ ] Role checks (the Admin screen gate)
- [ ] Billing and plans
- [ ] Autonomous apply experiments
- [ ] Public API
