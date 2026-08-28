# Title search

Discovery has two halves and they answer different questions.

The **watchlist** (`docs/DISCOVERY-PIPELINE.md`) answers *what is this company
hiring for*. It is exact, free and complete, and it needs you to already know
the company — a Greenhouse board token **is** the query.

**Title search** answers the question people actually start with: *who is
hiring a Salesforce Developer this week?* Nothing in the watchlist can, so
this exists alongside it rather than instead of it.

## Why the API and not the search page

Automating `google.com/search` is against Google's terms, and the block that
follows attaches to an IP rather than an account. On this deployment that IP
also serves Crawl4AI, Ollama, Ghost and n8n — one crawler would take all four
off the internet together.

`src/lib/jobs/index.ts` also states that discovery goes through documented
interfaces. That sentence is worth keeping true.

The Programmable Search JSON API is the same index, documented, permitted, and
free for 100 queries a day.

## Setup

**1 · An API key.** [console.cloud.google.com](https://console.cloud.google.com)
→ create a project → enable **Custom Search API** → Credentials → API key.

**2 · A search engine.**
[programmablesearchengine.google.com](https://programmablesearchengine.google.com)
→ Add. Then the step that matters:

> **Turn "Search the entire web" OFF** and list the ATS domains instead:
>
> ```
> job-boards.greenhouse.io/*
> boards.greenhouse.io/*
> jobs.lever.co/*
> jobs.ashbyhq.com/*
> *.myworkdayjobs.com/*
> ```

Skip this and the results are think-pieces about the job market rather than
jobs. Copy the **Search engine ID** — that is `cx`.

**3 · Set them.**

```bash
GOOGLE_SEARCH_KEY="…"
GOOGLE_SEARCH_CX="…"
```

## Watched titles

A saved search is a `job_criteria` row — a title, optionally a location, and a
remote flag. Managed on `/jobs`; no new table, and nothing new to learn.

Each run asks for pages Google indexed in the **last day** (`dateRestrict=d1`).
That is what makes a three-hourly schedule sane: without it, every run returns
the same evergreen postings and the only thing that changes is your quota.

## Running it every three hours

```
POST https://job.imswarnil.com/api/search
Authorization: Bearer $INGEST_TOKEN
```

Same token as `/api/ingest/*`, deliberately — same kind of caller, and a second
secret is a second thing to rotate and leak for no extra isolation.

**n8n** is the natural home, since it already runs the watchlist workflow:
add a Schedule node at `0 */3 * * *` and an HTTP Request node. A Vercel cron
works too on a plan that allows sub-daily schedules.

A run is bounded — see `FETCH_BUDGET` in `src/lib/jobs/search-runner.ts` — so
it returns in about a minute instead of running until something kills it.
Anything over the budget waits for the next run.

## What a run does

1. Ask Google for each saved title.
2. Drop everything already stored — **before** fetching any pages.
3. Fetch the remainder through Crawl4AI and store them.

Step 2 before step 3 is the whole efficiency of it. A three-hourly schedule
mostly rediscovers what it found last time, and re-fetching those pages would
be minutes of Crawl4AI work per run for zero new rows, on a two-core box that
is also running the model.

Postings whose page could not be read are stored **without** a description and
marked unscoreable on `/jobs` rather than dropped. The posting is real and its
URL works; hiding it would hide the fetch failure too.
