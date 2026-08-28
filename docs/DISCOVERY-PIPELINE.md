# The discovery pipeline

Phase 4 discovery runs as **one n8n workflow on the VPS**, not inside JobOS.
It reads a watchlist from JobOS, checks each company, and posts what it finds
back. JobOS owns the data and the rules; n8n owns the running.

```
                      ┌──────────────────────── VPS (srv1801954.hstgr.cloud) ─┐
  every 6h ─┐         │                                                        │
            ├→ Config → Get Watchlist ─→ Split ─→ Route by kind                │
  webhook ─┘         │                              │                          │
                      │        greenhouse ──────────┼─→ boards-api.greenhouse.io │
                      │        lever ───────────────┼─→ api.lever.co             │
                      │        careerpage ──────────┼─→ Crawl4AI → links → Ollama│
                      │                              ↓                          │
                      └──────────────── Send to JobOS → Run Summary ────────────┘
                                             ↓
                              job.imswarnil.com /api/ingest/jobs
```

## Why the work is not in Next

A crawl plus a local model is minutes of wall clock, which outlives a Vercel
function. Crawl4AI and Ollama also live on the VPS and are not reachable from
Vercel except by being exposed publicly. Both arguments point the same way:
run it beside the services it uses, and let JobOS receive the result.

That makes `/api/ingest/*` the only write in JobOS that does not come from a
session — the documented exception to "writes are server actions", and the
reason it is gated on a secret instead of a cookie.

## The two endpoints

Both take `Authorization: Bearer $INGEST_TOKEN`. The account is
`INGEST_OWNER_ID` from the environment and is **never** read from the body, so
a leaked token can only write into the account it was issued for.

**`GET /api/ingest/watchlist`** returns the enabled sources:

```json
{ "sources": [
  { "id": "…", "kind": "greenhouse", "label": "GitLab",
    "target": "gitlab", "keywords": ["salesforce", "analytics"] }
] }
```

**`POST /api/ingest/jobs`** takes one source's results:

```json
{ "sourceId": "…", "error": null,
  "jobs": [{ "source": "greenhouse", "externalId": "8705017002",
             "title": "Staff Systems Engineer", "company": "GitLab",
             "location": "Remote, United States", "remote": true,
             "url": "https://…", "description": "…",
             "postedAt": "2026-08-20T00:00:00Z" }] }
```

and answers `{ received, deduped, inserted, updated }`.

`externalId` is required here even though the column is nullable, because
Postgres treats NULLs as distinct: a null would slip past the
`(owner_id, source, external_id)` unique index and re-import the same posting
on every run. Crawled pages have no provider id, so the runner hashes the URL.

Two fields are never overwritten on re-import: **`status`** and
**`matchScore`**. A posting you have already applied to must not be reset to
`found` because the crawler saw it again — the most damaging thing a naive
upsert could do here.

## The watchlist

`job_source` (migration `0004_job_source`) is the list of companies to check.
It is the single source of truth: adding a company must never mean editing the
workflow. Disabling one stops it being checked on the very next run.

| kind | `target` is | fetched by |
| --- | --- | --- |
| `greenhouse` | board token, e.g. `gitlab` | public JSON feed |
| `lever` | board token, e.g. `leverdemo` | public JSON feed |
| `careerpage` | full https URL | Crawl4AI, one page |

`last_run_at` and `last_error` are stamped on every run, so a board that has
quietly 404'd for a month is visible rather than merely absent.

**Point a `careerpage` at the listing page, not the marketing page.** This is
the most common way to get nothing back. `freshworks.com/company/careers/`
looks right and contains zero jobs — the real listings are on
`careers.smartrecruiters.com/Freshworks`. Follow the "see open roles" link
once, by hand, and store where it lands.

## What Ollama is and is not asked to do

The model does **not** extract the listings. That was measured on one real
page, and the result was not close:

| | jobs found | time |
| --- | --- | --- |
| Regex over Crawl4AI markdown | **30 / 30** | 0.2 ms |
| `llama3.2:3b` structured output | 24 / 30 | 199 s |

So link extraction is a Code node, and the model gets the job it is actually
good at: deciding which of those titles are relevant *by meaning*. That call
is 333 tokens in, 68 out, **22 s** — and it catches "Lead - Data Scientist"
for someone who asked for "analytics", which no keyword match would.

If the model times out or returns nonsense, the runner keeps **every**
candidate rather than none. Erring toward too many jobs costs a scroll; the
other direction loses the role.

Greenhouse and Lever skip the model entirely — their feeds are already
structured, and keyword filtering there is a substring match, OR rather than
AND, matching `matchesKeywords()` in the in-app connectors.

## Cost of a run

2 vCPU, no GPU, so inference is CPU-bound and the numbers are what they are:

- Feed sources: about a second each.
- A career page: ~10 s to crawl, plus ~22 s of model time.
- **First model call after idle pays ~46 s of load**, because Ollama unloads
  after five minutes. On a six-hourly schedule every run is cold. The workflow
  sends `keep_alive: 30m` so only the first call in a run pays it.

`llama3.2:3b` is the model here. `gemma4` is on the box but is 9.6 GB against
7.8 GB of RAM with no swap — loading it would OOM the VPS and take Ghost and
n8n down with it.

## Setting it up

The workflow and both credentials are already imported on the VPS. From a
clean start it would be:

```bash
# 1. secret, and the account it writes for
openssl rand -hex 32                      # → INGEST_TOKEN in .env.local
psql> select id, email from neon_auth."user";   # → INGEST_OWNER_ID

# 2. push to Vercel and deploy — the routes must be live before a run
./scripts/vercel-env.sh
vercel --prod

# 3. import the workflow
ssh hostinger-vps 'cat > /tmp/wf.json' < docs/n8n/jobos-discovery-sync.json
ssh hostinger-vps 'docker cp /tmp/wf.json n8n-pn8d-n8n-1:/tmp/wf.json && \
  docker exec n8n-pn8d-n8n-1 n8n import:workflow --input=/tmp/wf.json'
```

Credentials are two n8n **Header Auth** entries, `JobOS Ingest` and
`Crawl4AI`, each `Authorization: Bearer <token>`. Import them with
`n8n import:credentials` and **delete the file afterwards, inside the
container as root** — `docker cp` lands it owned by root and n8n runs as
`node`, so the container's own `rm` cannot remove it.

Then open <https://n8n.imswarnil.com>, check the Config node's four values,
and activate. Run it by hand once first: `Execute Workflow` shows every
node's output, which is the fastest way to see a board token that 404s.

On demand: `POST https://n8n.imswarnil.com/webhook/jobos-sync`.

## When it returns nothing

Work down the flow — each stage has a distinct failure.

1. **`Get Watchlist` 401** — token mismatch between the n8n credential and the
   deployed `INGEST_TOKEN`. **404** means the routes are not deployed yet.
2. **`Get Watchlist` 500** — `INGEST_TOKEN` is unset or under 32 characters in
   the *deployed* environment. Ingest fails closed rather than falling open.
3. **A board returns nothing** — check the token by hand:
   `curl -s -o /dev/null -w '%{http_code}' https://boards-api.greenhouse.io/v1/boards/<token>/jobs`
4. **A career page returns nothing** — either it is a marketing page (see
   above) or robots.txt disallows it, which is a recorded outcome and not
   something to route around.
5. **Everything imported but nothing looks relevant** — the keyword filter on
   feed sources is a plain substring match. `crm` matches `crm`, not
   `Customer Relationship Management`.

## Not in this pipeline

- **Aggregators.** LinkedIn, Indeed and Naukri forbid it, block datacentre
  IPs, and a ban would cost Ghost and n8n on the same address.
- **Detail pages.** The runner never follows a link out of a listing. To get
  a full description, open the job in JobOS and use *fetch from URL* — one
  page, on a user action, which is what `fetch-posting.ts` is for.
- **Match scoring.** Still `TODO(Phase 4)`; ingest deliberately leaves
  `match_score` untouched so a scoring pass can own it.
