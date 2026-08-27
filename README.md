# JobOS

A career operating system. Log the work, build the resume, tailor it to the
role, track every application — one system instead of four half-remembered
ones.

**Live:** [job.imswarnil.com](https://job.imswarnil.com)

## Try it

Click **Explore the demo account** on the sign-in page — one click, no sign-up.
Or sign in with the credentials directly:

| | |
| --- | --- |
| **Email** | `demo@jobos.app` |
| **Password** | `jobos-demo-60645d8d` |

It is a real account, not a mock: 15 journal entries across all six log types,
two companies, three projects and a filled-in resume. Write in it, delete things, break it — run
`pnpm db:seed` to reset it to a known state.

These credentials are public on purpose. The account holds nothing but seed
data, and it is the only one that does — treat it as a fixture, not a login.

Read [`docs/ABSTRACT.md`](docs/ABSTRACT.md) for what it is and why, and
[`docs/ROADMAP.md`](docs/ROADMAP.md) for what lands when.

---

## Status

| Phase | | |
| --- | --- | --- |
| **0 · Foundation** | ✅ shipped | Design language, app shell, schema, seams |
| **1 · Work Journal** | 🔨 in progress | Real accounts, six log types, entry CRUD |
| **2 · Resume Builder** | 🔨 in progress | Section editor, live ATS preview |
| 3 · JD tailoring | planned | Rewrite from real facts, local model first |
| 4–5 · Jobs & agent | planned | Public job APIs, pipeline, scheduled agent |
| 6 · Stretch | planned | Teams, billing |

## Stack

| | |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, hand-rolled components |
| Type | Figtree |
| Database | Neon Postgres via Drizzle ORM + `@neondatabase/serverless` |
| Auth | Neon Auth — Better Auth, hosted by Neon |
| Validation | Zod, server actions |
| Icons | Lucide |
| Package manager | pnpm |
| Hosting | Vercel |
| Models | AnythingLLM → Ollama (self-hosted) → Gemini → Groq (hosted fallback) |
| App | Installable PWA with offline fallback |

**Database and auth are the same vendor on purpose.** Neon Auth writes its
tables into the `neon_auth` schema of the same Postgres, so `owner_id` is an
ordinary foreign key rather than a call to someone else's API — and there are
no adapter tables to maintain. See [`docs/DATABASE.md`](docs/DATABASE.md).

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

Vermilion is the record light. It marks the live thing — the active nav item,
the primary action, the phase in progress. If three things on a screen are
accent-coloured, two of them are wrong.

## Running it

```bash
pnpm install
cp .env.example .env.local     # then fill it in — see below
pnpm dev                       # http://localhost:3000
```

### `dev` vs `preview`

`pnpm dev` compiles each route the first time you visit it and recompiles on
every edit, which is what you want while writing code and not what you want
while *testing* it. For clicking through the app, use a production build:

```bash
pnpm preview          # build, then serve it
pnpm preview:serve    # skip the build if nothing changed
```

Measured on this app, framework overhead is about **3ms** per page. Almost all
of the rest is round trips: the session lookup and the database queries, both
of which cross the Atlantic to `us-east-2`. Neither `dev` nor `preview`
changes that — a page that feels slow is usually waiting on the network, not
on Next.js. Put the Neon project in the region nearest you if it matters.

JobOS needs a real database and a real auth instance; there is no offline mode.
Both come from one Neon project, and every value in `.env.local` can be
produced from the CLI:

```bash
npx neonctl neon-auth enable --project-id <id> --branch <branch>
npx neonctl connection-string production --project-id <id> --pooled
npx neonctl connection-string production --project-id <id>
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Then apply the schema and seed the demo:

```bash
pnpm db:migrate
node scripts/apply-sql.mjs drizzle/0001_owner_foreign_keys.sql
pnpm db:seed
pnpm db:check     # confirms all of the above actually landed
```

[`docs/DATABASE.md`](docs/DATABASE.md) explains each step, including why the
foreign keys are a separate file.

## Deploying

Vercel, with no adapter and no custom build command.

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Set the environment variables from `.env.example` — at minimum
   `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL` and
   `NEON_AUTH_COOKIE_SECRET`. Add `DEMO_EMAIL` / `DEMO_PASSWORD` to enable the
   demo button.
3. Add the domain, and point DNS at Vercel.
4. **Register the origin with Neon Auth**, or sign-in will fail in production
   while working locally:

   ```bash
   npx neonctl neon-auth domain add https://job.imswarnil.com \
     --project-id <id> --branch <branch>
   ```

Every route that reads a session is `force-dynamic`; nothing user-specific is
prerendered.

## Folder structure

```
src/
├── app/
│   ├── layout.tsx              Figtree, metadata, pre-paint theme script
│   ├── globals.css             design tokens → Tailwind bridge → base → utilities
│   ├── page.tsx                public homepage — the pitch, the story, the stack
│   ├── (auth)/                 sign-in and sign-up
│   ├── (app)/                  signed-in area — requireUser() guards the layout
│   │   ├── dashboard/          real stats, streak, latest entries
│   │   ├── journal/            ✅ six log types, composer, filters
│   │   ├── resume/             ✅ section editor + live ATS preview
│   │   ├── jobs/               P4 placeholder
│   │   ├── applications/       P4 placeholder
│   │   ├── settings/           profile, theme, integrations, data
│   │   └── admin/              instance stats, accounts, services
│   └── api/auth/[...path]/     proxies auth calls, owns the session cookie
├── components/
│   ├── ui/                     button, card, badge, input
│   ├── shell/                  sidebar, topbar, user menu, theme toggle
│   ├── journal/                composer, entry card, type filter
│   └── auth-form.tsx
└── lib/
    ├── auth/                   server.ts · index.ts · actions.ts · scope.ts
    ├── db/                     client, schema, Neon-managed identity
    ├── journal/                types, queries, actions
    ├── admin/                  instance-wide queries
    ├── llm/ jobs/ resume/      P2–P4 stubs
    ├── nav.ts phases.ts marketing.ts   the app, as data
    └── theme.ts utils.ts
drizzle/    generated migration + the hand-written FK migration
scripts/    seed.mjs · apply-sql.mjs
docs/       ABSTRACT · ROADMAP · DATABASE
```

## Conventions worth knowing

**Ownership is never implicit.** Domain queries go through `scope()` from
`src/lib/auth/scope.ts`, and `owner_id` is a real foreign key. The one
exception is `src/lib/admin/queries.ts`, which is instance-wide by design.

**The nav, the roadmap and the homepage are data.** `src/lib/nav.ts`,
`src/lib/phases.ts` and `src/lib/marketing.ts` drive the sidebar, the phase
badges, the placeholders and the landing page. Shipping a phase is an edit to
one of those files, not a sweep through templates.

**Writes are server actions.** No API routes for mutations; the owner comes
from the session, never from the form.

**`TODO(Phase N):`** marks every seam. `grep -rn "TODO(Phase" src/`

## Scripts

| | |
| --- | --- |
| `pnpm dev` | development server (compiles on demand) |
| `pnpm preview` | build and serve — what to use for click-testing |
| `pnpm preview:serve` | serve the last build without rebuilding |
| `pnpm check` | build + typecheck + lint, all three |
| `pnpm build` | production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:generate` | generate a migration from the schema |
| `pnpm db:migrate` | apply migrations |
| `pnpm db:seed` | create and populate the demo account |
| `pnpm db:check` | verify schema, FKs, auth tables and env in one command |
| `pnpm vercel:env` | push `.env.local` into a linked Vercel project |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm icons` | regenerate the PWA icon set |

## Licence

MIT.
