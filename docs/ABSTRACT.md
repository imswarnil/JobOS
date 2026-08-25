# JobOS — abstract

JobOS is a **career operating system**: one place where the work you do becomes
the record that gets you hired.

The premise is that almost everyone loses their own career history. You do good
work for two years, then sit down to write a resume and can remember three
things about it. The fix is not a better resume template — it is keeping the
record in the first place, and then generating everything else from it.

## Four pillars

**1 · Work Journal.** Log daily work — the company, the project, the tasks, what
fought back, the technologies involved, and what actually changed as a result.
This is the source of truth. Every other pillar reads from it.

**2 · Resume Builder.** Maintain one structured master resume, edit it in the
browser, and export an ATS-friendly PDF. The content is drawn from the journal
rather than typed from memory.

**3 · JD-Tailored Resume.** Paste a job description or a URL. A language model
rewrites the resume to match it — reordering, re-emphasising and re-wording,
using **only real facts from the journal**. It never invents an employer, a
date, a metric or a skill. Where the posting asks for something the record
cannot support, it says so rather than filling the gap.

**4 · Job Agent.** Discover matching roles through legitimate public job APIs,
auto-tailor a resume for the best of them, assist with applying, and track
every application through to its outcome.

## Operating constraints

JobOS runs today as a **free, single-user application** — one person, one
database, no billing, no teams. It is nonetheless architected so it can become
multi-tenant SaaS without a rewrite:

- Every domain table carries an `owner_id` from day one.
- Every read and write of domain data is scoped by the current user's id,
  through a single helper rather than by convention.
- A documented extension point exists for an `organization_id` / teams layer.
  It is not built.
- Inputs are validated with Zod; the stack is type-safe end to end.

## Ethics

Two rules that are architectural, not aspirational:

**The resume tells the truth.** Tailoring reorders and re-emphasises real facts.
A resume that lies is worse than no resume, so the model is given a grounding
set of journal entries and is not permitted to go outside it.

**Discovery is above board.** Job data comes from documented public APIs and
published feeds — Greenhouse and Lever board endpoints, the Adzuna developer
API. No scraping, no automated login to anyone's account, no working around a
rate limit or a robots.txt.
