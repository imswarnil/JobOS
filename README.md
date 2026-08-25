# JobOS

A career operating system. Log the work, build the resume, tailor it to the
role, track every application — one system instead of four half-remembered
ones.

Read [`docs/ABSTRACT.md`](docs/ABSTRACT.md) for what it is and why, and
[`docs/ROADMAP.md`](docs/ROADMAP.md) for what lands when.

**Status: Phase 0 — foundation and skeleton.** The shell is real; the features
are not. Every screen renders, nothing persists, and authentication is
deliberately switched off so the whole app is browsable without credentials.

---

## Stack

| | |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, hand-rolled components |
| Type | Figtree |
| Database | Neon Postgres via Drizzle ORM + `@neondatabase/serverless` |
| Auth | Neon Auth — *planned, not yet wired* |
| Validation | Zod + React Hook Form |
| Icons | Lucide |
| Package manager | pnpm |
| Deploy target | Vercel |

**Database and auth are the same vendor on purpose.** Neon Auth syncs users
into a `neon_auth.users_sync` table inside the same Postgres, so `owner_id` is
an ordinary foreign key rather than a call to someone else's API — and there
are no adapter tables to maintain. See [`docs/DATABASE.md`](docs/DATABASE.md).

## Design

The visual language is [Frame & Signal](https://design.imswarnil.com) — the
same ink-neutral palette and vermilion accent as the rest of imswarnil.com —
with one departure: JobOS runs a **single typeface, Figtree**, and gets its
hierarchy from weight, size and tracking rather than from three families.

Tokens live at the top of `src/app/globals.css` in two tiers: primitive ramps,
then semantic aliases. **Components may only use the aliases.** A
`@theme inline` block bridges them into Tailwind, so `bg-surface`,
`text-fg-muted` and `border-line` resolve correctly in both themes from one set
of classes. Adding a colour means adding an alias and one bridge line.

## Getting started

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

That is genuinely all Phase 0 needs — no database, no keys. The app boots,
every route renders, and the theme toggle works.

## When you're ready for real data (Phase 1)

```bash
cp .env.example .env.local     # paste your Neon pooled connection string
pnpm db:migrate                # apply drizzle/0000_phase_0_foundation.sql
```

Then follow [`docs/DATABASE.md`](docs/DATABASE.md) — it covers enabling Neon
Auth, adding the ownership foreign keys, and replacing the placeholder session.

To change the schema: edit `src/lib/db/schema.ts`, then `pnpm db:generate`.
Never edit a generated migration that has already been applied.

## Deploying to Vercel

Import the repository, set `DATABASE_URL` (and, later, the auth and model keys
from `.env.example`) as environment variables, and deploy. No adapter or custom
build command is needed. Everything currently prerenders as static.

## Folder structure

```
src/
├── app/
│   ├── layout.tsx              Figtree, metadata, pre-paint theme script
│   ├── globals.css             design tokens → Tailwind bridge → base → utilities
│   ├── (auth)/                 unauthenticated screens
│   │   ├── layout.tsx          split shell: form left, pitch right
│   │   ├── login/
│   │   └── signup/
│   └── (app)/                  the application
│       ├── layout.tsx          calls requireUser(), renders the shell
│       ├── dashboard/          welcome, stats, roadmap
│       ├── journal/            P1 placeholder
│       ├── resume/             P2 placeholder
│       ├── jobs/               P4 placeholder
│       ├── applications/       P4 placeholder
│       ├── settings/           live: theme; rest disabled
│       └── admin/              live: instance and session state
├── components/
│   ├── ui/                     button, card, badge, input
│   ├── shell/                  sidebar, topbar, user menu, theme toggle
│   ├── auth-form.tsx           login/signup form (unwired)
│   ├── page-header.tsx
│   ├── phase-placeholder.tsx   the screen every unbuilt route renders
│   └── stat-tile.tsx
└── lib/
    ├── auth/                   getCurrentUser() + scope() — the ownership seam
    ├── db/                     Drizzle client, schema, Neon-managed identity
    ├── llm/                    Gemini/Groq interface (P3 stub)
    ├── jobs/                   JobSource interface + connectors (P4 stubs)
    ├── resume/                 generatePdf() (P2 stub)
    ├── nav.ts                  the sidebar, as data
    ├── phases.ts               the roadmap, as data
    └── utils.ts
drizzle/                        generated SQL migrations
docs/                           ABSTRACT · ROADMAP · DATABASE
```

## Conventions worth knowing

**The nav and the roadmap are data.** `src/lib/nav.ts` and
`src/lib/phases.ts` drive the sidebar, the placeholders, the dashboard roadmap
and the auth aside. Adding a screen or shipping a phase is an edit to one of
those files, not a sweep through templates.

**Ownership is never implicit.** Domain queries go through `scope()` from
`src/lib/auth/scope.ts`. There is one user today; that is exactly why the
habit is worth having now.

**`TODO(Phase N):`** marks every seam where future work plugs in. Grep for it:

```bash
grep -rn "TODO(Phase" src/
```

## Scripts

| | |
| --- | --- |
| `pnpm dev` | development server |
| `pnpm build` | production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:generate` | generate a migration from the schema |
| `pnpm db:migrate` | apply migrations (needs `DATABASE_URL`) |
| `pnpm db:studio` | Drizzle Studio |
