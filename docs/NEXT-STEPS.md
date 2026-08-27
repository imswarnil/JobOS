# Next steps — what I need, and how your VPS fits

Written 2026-08-27, after Phase 3 landed. Two questions answered here: what
you have to hand me before the rest can be built, and how `crawl4ai`,
`ollama` and `n8n` on your VPS plug into JobOS.

There is a third thing running through it. You said the app should be easy
to add logs to, personal rather than corporate. That is not a nice-to-have
at the end — it changes what gets built, so it has its own section, and it
comes first.

---

## 1. Make it personal, and make logging cheap

The journal only works if you actually write in it. Every feature below is
judged against one question: **does this make it more likely you log
something on a Tuesday when you are tired?**

### What is wrong today

The composer asks for a type, a title, a body, a company, a project, an
impact, challenges, tech tags, tags and minutes spent. Ten fields. Most are
optional, but optional fields still *read* as work — a form with ten boxes
looks like a form with ten boxes, and the cost of writing anything at all
goes up. The page also opens with "Work journal" and a paragraph explaining
itself, which is a landing page, not a place you dash something down.

### What to build

**a. One box, always there.** The top of the journal is a single text field
that already has focus. You type a line and press enter. That is a complete
entry: type defaults to `work`, date to today, company to your current one.
No expanding, no dropdown, no save button to hunt for.

**b. Natural-language dates in the same box.** `fixed the migration
yesterday` files under yesterday. `learned about window functions on
monday` files under Monday and picks the `learning` type from the verb.
Parsed on the client so you see it resolve as you type, and always
correctable — never silently wrong.

**c. Everything else, later.** Impact, challenges and tags move out of
"writing an entry" and into "improving an entry". A card shows a quiet
`+ impact` when the field is empty. The entry exists first; the detail is
something you add when you have a minute, not a toll on the way in.

**d. Language that sounds like a person.** Empty states, buttons and
headings get read once and set the tone permanently. "Work journal —
everything that made you better at your job" is a mission statement. "What
happened today?" is a question you can answer. Same for the six log types:
keep the six, drop the taxonomy feel in how they are presented.

**e. Fewer chrome elements per screen.** Right now the journal shows a page
header, a composer, a search box, six type chips, a view switcher, a
group-by control and then the entries. That is seven controls above your
first entry. Search and grouping can collapse behind one affordance until
asked for.

**This is the work I would do first**, before any of the VPS integration —
it is the difference between a system you use and a system you admire and
abandon. I have not started it because I would rather you confirm the
direction than find I have rewritten your composer in a way you dislike.

> One thing I would push back on: I would not remove the six log types or
> the company link. They are what makes the resume builder able to say
> "you did this, at this place, and here is the proof". The fix is to stop
> *asking* for them up front, not to stop having them.

---

## 2. Credentials and decisions I need

Ordered by what unblocks the most.

### Blocking now

**1. A migration, approved.** The Greenhouse and Lever connectors are built
and tested against live boards, but they have nowhere to look: a board token
is the query, and there is no table to keep tokens in. That needs a new
`watchlist` table, which means `pnpm db:generate` and `pnpm db:migrate`.
`main` auto-deploys to Vercel, so the migration has to be applied to the
production database too. **I will not run that without you saying so.**

**2. Company board tokens.** Once the table exists — the slugs from
`boards.greenhouse.io/<token>` or `jobs.lever.co/<token>` for places you
would genuinely apply. Ten is plenty to start. You enter these in the app;
they are not a credential.

**3. The VPS answer.** Still unreachable — port 22 filtered, everything
else filtered, from a machine whose network is otherwise fine. Section 3
cannot start until that changes.

### Needed when we get there

| What | Where from | Unblocks |
|---|---|---|
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | developer.adzuna.com, free tier | Broad job search rather than per-company |
| `OLLAMA_BASE_URL` + `OLLAMA_API_KEY` | Your VPS, section 3 | Self-hosted inference, unmetered |
| `CRAWL4AI_BASE_URL` + `CRAWL4AI_API_KEY` | Your VPS, section 3 | Pasting a job link that renders client-side |
| `JOBOS_AUTOMATION_TOKEN` | Generated, section 3.4 | n8n triggering runs |
| A domain or subdomain | Your DNS | TLS for the three services above |

### Decisions, not credentials

- **Does JobOS stay on Vercel, or move to the VPS?** This changes
  everything below. See section 3.1 — it is the first real fork.
- **How much RAM does the VPS have?** Asked three times now. It decides
  whether Ollama is worth using at all, and I would rather tell you it is
  not than let you find out after the setup.

---

## 3. Your VPS

### 3.1 The fork: where does JobOS run?

You have Ollama, crawl4ai and n8n on a box, and JobOS on Vercel. Vercel is
not on your network. Every integration below is really the same question:
how does a Vercel function reach a service on your VPS?

**Option A — keep JobOS on Vercel, expose the three services.**
Each service needs a public hostname, TLS, and its own auth. More setup,
and three new things on the internet to keep patched.

**Option B — move JobOS onto the VPS too.**
Then everything talks over `localhost` or a private Docker network, nothing
but JobOS is exposed, and no service needs its own public TLS. You give up
Vercel's deploy pipeline and preview URLs, and you own uptime.

**I would take B**, and not narrowly. You already run a VPS and already have
the three services on it; putting the app beside them turns four public
surfaces into one, deletes three sets of credentials, and makes the Ollama
latency question disappear because the model is a process away rather than a
network away. Vercel earns its keep for a site with traffic — this is a
personal tool with one user.

If you want A, that is fine and everything below still works; you just do
the TLS and auth parts three times instead of once. **The rest of this
section assumes B, and flags where A differs.**

Neon stays the database either way. It is also the auth provider, and moving
off it is a much larger change than moving the app.

### 3.2 Ollama

Already wired — the provider shipped in `2ceefbd`. Nothing to build, only to
configure.

```bash
# on the VPS
ollama pull llama3.2:3b          # start small, see 3.6
ollama list
curl -s localhost:11434/api/tags | head
```

Then, in JobOS's environment:

```bash
OLLAMA_BASE_URL="http://localhost:11434"   # option B
OLLAMA_MODEL="llama3.2:3b"
LLM_PROVIDER_ORDER="ollama,gemini,groq"    # self-hosted first
LLM_RATE_LIMIT="0"                         # unmetered; it costs you nothing
```

Under option A this becomes a public HTTPS URL and `OLLAMA_API_KEY`, because
Ollama has **no authentication of its own** — an exposed instance is a free
GPU for the whole internet. Put it behind Caddy or nginx with a bearer token
and never expose 11434 directly.

`LLM_RATE_LIMIT="0"` is only correct once Ollama is actually first in the
order. Set it while Gemini is still serving requests and you have removed
the cap on a key someone pays for.

### 3.3 crawl4ai

Also already anticipated: `src/lib/tailor/fetch-posting.ts` reads
`CRAWL4AI_BASE_URL` and posts to `/crawl`. Configure it and paste job links
that would otherwise come back empty.

```bash
CRAWL4AI_BASE_URL="http://localhost:11235"
CRAWL4AI_API_KEY="…"
```

Why it matters: many boards render the description in the browser, so a
plain fetch gets an empty shell. crawl4ai runs a real browser and returns
markdown.

**Read the comment at the top of that file before extending this.** It draws
a line deliberately: one page, once, on an explicit user action. No queue,
no pagination, no link-following. Discovery goes through documented APIs —
that is what the Greenhouse and Lever connectors are. A general-purpose
crawler pointed at job boards is how that promise stops being true, and
crawl4ai makes it easy to cross that line without noticing. Keep it for
"the user pasted this one link".

Under option A, note that `/crawl` with no API key is a fetch-any-URL
service running under your server's name. Set the key.

### 3.4 n8n — and the piece that does not exist yet

n8n is where Phase 5 lives: a nightly discovery run, a weekly digest,
notifications. But n8n cannot drive JobOS today, because **every write in
JobOS is a server action authenticated by a session cookie**, and n8n has no
session. That is a deliberate design (`CLAUDE.md`: "Writes are server
actions, never API routes"), so this is a real gap, not an oversight.

What has to be built first:

1. **A machine-authenticated endpoint.** `POST /api/automation/discover`,
   authorised by a bearer token in an env var, not a cookie. Narrow on
   purpose: it runs discovery for one named owner and returns a summary. It
   is not a general API.
2. **`JOBOS_AUTOMATION_TOKEN`**, generated by you:
   ```bash
   openssl rand -hex 32
   ```
   Set it in JobOS's environment and in n8n's credential store. Compared in
   constant time, and the endpoint should refuse to start if it is unset —
   never fall open.
3. **The n8n workflow**: Schedule (daily 07:00) → HTTP Request (POST, bearer
   header) → IF (new jobs > 0) → notify. That is the whole thing; n8n is a
   cron with a UI here, and the intelligence stays in JobOS where it can be
   tested.

**Ordering note:** on the VPS, n8n reaches JobOS at
`http://jobos:3000` over the Docker network, so this endpoint never needs to
be public. Under option A it does, which is another reason to prefer B.

Do not have n8n write to the database directly. The moment two things write
`work_log`, the owner-scoping rules in `src/lib/auth/scope.ts` stop being a
guarantee.

### 3.5 A rough shape for option B

```yaml
# docker-compose.yml — sketch, not tested
services:
  jobos:      # next start, env from .env.production
  ollama:     # ollama/ollama, volume for models
  crawl4ai:   # unclecode/crawl4ai
  n8n:        # n8nio/n8n, volume for workflows
  caddy:      # the only published ports: 80, 443
```

Only Caddy publishes ports. The other four talk over the internal network
and are unreachable from outside, which is the entire security argument for
option B: one door instead of four.

You will need a domain pointed at the VPS for Caddy to get certificates.

### 3.6 About Ollama, honestly

I have asked for the RAM figure three times and will stop after this, but I
want the expectation set before you spend an evening on it.

JobOS does not use a model to chat. It uses one for **structured
extraction** — read a job posting, return strict JSON; read journal entries,
name a role. That is the task class where small models fail worst, and they
fail by returning almost-valid JSON, which is more annoying than failing
outright.

- **Under 8 GB** — 3B models only. Expect noticeably worse extraction than
  Gemini. Fine for "define my role", weak for JD parsing. Keep Gemini first.
- **8–16 GB** — 7–8B quantized, genuinely usable. Slower than Gemini on CPU
  (tens of seconds), but unmetered and private. Worth putting first.
- **16 GB+** — 14B and up, and the tradeoff clearly favours self-hosting.

There is no GPU on a standard Hostinger VPS, so all of this is CPU
inference. The `LLM_PROVIDER_ORDER` fallback chain exists exactly so you can
try Ollama first and have it fall through to Gemini when it returns
something unusable — you do not have to choose once and live with it.

---

## 4. Suggested order

1. **The composer and the tone** (section 1) — no credentials, biggest
   difference to whether you use this.
2. **The watchlist migration** + connector UI — turns two working connectors
   into a feature.
3. **Decide A or B** (section 3.1), then wire Ollama and crawl4ai.
4. **The automation endpoint**, then n8n. Phase 5.
5. Adzuna, if per-company boards prove too narrow.

Steps 1 and 2 need nothing from the VPS. If it stays unreachable, that is
still weeks of useful work.

---

## 5. The short version

Reply with:

1. **Yes or no to the migration** (unblocks the watchlist immediately)
2. **`free -h` from the VPS** (decides Ollama)
3. **A or B** (decides everything about integration)
4. **Whether section 1 sounds right** before I rewrite the composer

Nothing else is blocking.
