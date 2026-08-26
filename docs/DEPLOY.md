# Deploying JobOS

Target: **Vercel**, at `job.imswarnil.com`. No adapter, no custom build
command — Next.js 16 deploys as-is.

Repository: <https://github.com/imswarnil/JobOS>

## What has to be true

JobOS is fully dynamic. Every route that reads a session is `force-dynamic`,
because a prerendered page would bake one visitor's account into static
output. That means it needs a server runtime — static hosting will not work.

Three things must line up, and the third is the one people forget:

1. The app can reach the database (`DATABASE_URL`).
2. The app can reach the auth server (`NEON_AUTH_BASE_URL`) and sign its own
   cookies (`NEON_AUTH_COOKIE_SECRET`).
3. **Neon Auth trusts the deployed origin.** If this is missing, sign-in works
   perfectly on localhost and fails in production with an origin error.

## Environment variables

Copy them out of your local `.env.local` — Vercel's project settings have a
paste box that accepts a whole `.env` file at once, so you do not have to add
them one at a time.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Pooled (`-pooler`) host. Runtime queries. |
| `DATABASE_URL_UNPOOLED` | yes | Direct host. Migrations only. |
| `NEON_AUTH_BASE_URL` | yes | From `neonctl neon-auth enable`. |
| `NEON_AUTH_COOKIE_SECRET` | yes | 32+ characters, or the SDK throws at boot. |
| `DEMO_EMAIL` | optional | Enables the "Explore the demo account" button. |
| `DEMO_PASSWORD` | optional | Without it the button reports no demo configured. |
| `DEMO_NAME` | optional | Display name for the demo account. |
| `GEMINI_API_KEY` / `GROQ_API_KEY` | Phase 3 | Not read yet. |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Phase 4 | Not read yet. |

Set them for **Production, Preview and Development**. Preview deployments hit
the same database — there is only one Neon branch today. If that becomes a
problem, give previews their own Neon branch rather than sharing production.

## Steps

### 1 · Import the repository

<https://vercel.com/new> → import `imswarnil/JobOS`. Framework detection
picks Next.js; leave every build setting alone.

Paste the environment variables in. The build itself does not need them —
the auth client is constructed on first request, not at import, so a build
with an empty environment still succeeds. But the *running* app does: without
them, `/` renders as a signed-out visitor and any sign-in attempt fails.

### 2 · Add the domain

Project → Settings → Domains → add `job.imswarnil.com`. Vercel will show the
DNS record to create:

```
CNAME   job   cname.vercel-dns.com
```

(If `imswarnil.com` is on Cloudflare, set that record to **DNS only** — grey
cloud — so Vercel can issue the certificate.)

### 3 · Tell Neon Auth about the origin

Already done for `https://job.imswarnil.com`:

```bash
npx neonctl neon-auth domain add https://job.imswarnil.com \
  --project-id rapid-dust-20200619 --branch br-flat-bar-ax3wjots
npx neonctl neon-auth domain list \
  --project-id rapid-dust-20200619 --branch br-flat-bar-ax3wjots
```

Vercel preview URLs (`*.vercel.app`) are a different origin. Add the one you
actually use if you want to sign in on previews.

### 4 · Check it

- `/` loads and the theme toggle works → the build is fine.
- `/dashboard` while signed out → 307 to `/login` → auth is wired.
- *Explore the demo account* signs you in → the database, the auth server and
  the trusted origin all agree.

If the demo button reports that no demo is configured, `DEMO_EMAIL` /
`DEMO_PASSWORD` are missing from the Vercel environment.

## Doing it from the CLI instead

```bash
npx vercel login                # interactive — a browser opens
npx vercel link                 # connect this directory to a project
pnpm vercel:env                 # push every var from .env.local, all 3 targets
npx vercel --prod               # deploy
npx vercel domains add job.imswarnil.com
```

`pnpm vercel:env` reads `.env.local` and pipes each value to the CLI on stdin,
so nothing sensitive lands in argv or your shell history. It adds only what is
actually set, skips blanks, and leaves existing values alone — pass
`--replace` to overwrite them:

```bash
pnpm vercel:env --replace
```

**Check which account you are on before deploying.** `npx vercel whoami` prints
the current scope, and `npx vercel switch` changes it. Deploying to the wrong
scope creates a project in the wrong place, which is tedious to undo.

## Migrations

Migrations are **not** run by the Vercel build, deliberately — a build should
not be able to alter production schema as a side effect. Run them yourself
when the schema changes:

```bash
pnpm db:migrate
node scripts/apply-sql.mjs drizzle/0001_owner_foreign_keys.sql
```

Both use `DATABASE_URL_UNPOOLED`, so they need your local `.env.local`.
