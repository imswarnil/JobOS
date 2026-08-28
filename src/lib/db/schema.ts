import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* =============================================================================
   SHARED COLUMN SETS

   SaaS-readiness rule #1: every domain table carries `owner_id` from day one.
   There is one user today; there is no code path that assumes it.

   TODO(Phase 6): teams arrive as a nullable `organization_id` added to this
   same helper — every table picks it up at once, and rows with a null org stay
   personal. Ownership stays on the row either way, so no data migration is
   needed to introduce the concept.
   ==========================================================================*/

const ownership = {
  /**
   * Always `neon_auth.user.id`.
   *
   * A plain column rather than a Drizzle `.references()`: the target table
   * belongs to Neon Auth, and pointing Drizzle at it would drag the whole
   * `neon_auth` schema into our generated migrations. The real FK constraint
   * is added by `drizzle/0001_owner_foreign_keys.sql`, which runs after Auth
   * has provisioned the table.
   *
   * The join is still fully typed: import `authUser` from lib/db/neon-auth.
   */
  ownerId: uuid("owner_id").notNull(),
};

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* =============================================================================
   ENUMS
   ==========================================================================*/

/**
 * What kind of entry this is.
 *
 * A career record is not only "what I shipped". The things that actually make
 * you better — a thing you learned, a wall you hit, a trick worth keeping —
 * are the ones people forget fastest, and several of them happen outside any
 * employer. So the journal takes all of them, and `company_id` stays nullable
 * precisely so a personal entry does not have to be filed under a job.
 *
 *   work      what you built or shipped
 *   learning  something you now understand that you did not before
 *   challenge a problem you are in the middle of
 *   trick     a technique worth keeping — the reason you keep a journal
 *   setback   it went badly; write it down before you rationalise it
 *   win       it went well; resumes are made of these
 */
export const logType = pgEnum("log_type", [
  "work",
  "learning",
  "challenge",
  "trick",
  "setback",
  "win",
]);

/**
 * What kind of organisation an entry can be filed under.
 *
 * "Company" is the wrong word for half of them, but it is the table we have.
 * A course provider and a client are the same shape as an employer — a name
 * you attribute work to — so they share the row rather than getting tables of
 * their own.
 */
export const orgKind = pgEnum("org_kind", [
  "employer",
  "client",
  "education",
  "personal",
]);

/** The application pipeline, in the order a role actually moves through it. */
export const applicationStatus = pgEnum("application_status", [
  "found",
  "tailored",
  "applied",
  "interview",
  "offer",
  "rejected",
  "skipped",
]);

/**
 * Where a watchlist entry is checked.
 *
 * `greenhouse` and `lever` are board tokens against a published JSON feed.
 * `careerpage` is a company's own careers URL, read with a headless browser
 * because there is no feed to read instead — see the note on `jobSource`.
 */
export const jobSourceKind = pgEnum("job_source_kind", [
  "greenhouse",
  "lever",
  "careerpage",
]);

/* =============================================================================
   TRACK RECORD — Phase 1
   ==========================================================================*/

export const company = pgTable(
  "company",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...ownership,
    name: text("name").notNull(),
    kind: orgKind("kind").notNull().default("employer"),
    /**
     * Where you are now. The composer defaults to it, which is the whole
     * point — most entries belong to wherever you currently spend your days.
     * Not unique-constrained: contracting two places at once is normal.
     */
    isCurrent: boolean("is_current").notNull().default(false),
    role: text("role"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("company_owner_idx").on(t.ownerId),
    // One name per person, not per instance.
    uniqueIndex("company_owner_name_idx").on(t.ownerId, t.name),
  ],
);

export const project = pgTable(
  "project",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...ownership,
    companyId: uuid("company_id").references(() => company.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    startDate: date("start_date"),
    /** Null means ongoing. */
    endDate: date("end_date"),
    ...timestamps,
  },
  (t) => [
    index("project_owner_idx").on(t.ownerId),
    index("project_company_idx").on(t.companyId),
  ],
);

/**
 * The centre of gravity. Everything JobOS generates — resumes, tailored
 * rewrites, match scores — is derived from these rows, which is why the
 * columns are prose fields rather than a rigid taxonomy: you should be able
 * to write the entry in the two minutes you actually have.
 */
export const workLog = pgTable(
  "work_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...ownership,
    type: logType("type").notNull().default("work"),
    /** The day it happened, not the day it was written down. */
    occurredOn: date("occurred_on").notNull(),
    /** A one-line headline. What you would say if someone asked. */
    title: text("title").notNull(),
    /**
     * The entry itself. Prose, not a taxonomy.
     *
     * Nullable on purpose: the fastest useful log is a headline and nothing
     * else. Requiring a body would mean the difference between capturing a
     * thought and losing it, and a title-only entry is worth infinitely more
     * than the entry you did not write.
     */
    body: text("body"),
    /** Null for anything personal: a side project, a course, a book. */
    companyId: uuid("company_id").references(() => company.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => project.id, {
      onDelete: "set null",
    }),
    /** What fought back. Mostly used by `work` and `challenge` entries. */
    challenges: text("challenges"),
    /** What changed because of it — the part resumes are actually made of. */
    impact: text("impact"),
    techTags: text("tech_tags").array().notNull().default([]),
    tags: text("tags").array().notNull().default([]),
    minutesSpent: integer("minutes_spent"),
    ...timestamps,
  },
  (t) => [
    // The timeline query: this person's entries, newest first.
    index("work_log_owner_date_idx").on(t.ownerId, t.occurredOn),
    // The filtered timeline: "show me every trick I have learned".
    index("work_log_owner_type_idx").on(t.ownerId, t.type),
    index("work_log_project_idx").on(t.projectId),
  ],
);

/* =============================================================================
   MODEL USAGE — the rate limit's ledger
   ==========================================================================*/

/**
 * One row per model call, successful or not.
 *
 * The rate limit is enforced by counting rows in a window rather than by a
 * counter that gets decremented, because a counter cannot answer "why was I
 * blocked" and cannot expire on its own. This can: the window is a WHERE
 * clause, and the rows are their own audit trail.
 *
 * Failed calls are recorded too. A provider erroring still cost the shared
 * key a request, and not counting it turns a retry loop into an unbounded one.
 */
export const llmUsage = pgTable(
  "llm_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...ownership,
    /** Which feature spent it — "define-role", later "tailor-resume". */
    feature: text("feature").notNull(),
    /** Which provider actually answered: gemini | groq. */
    provider: text("provider").notNull(),
    ok: boolean("ok").notNull().default(true),
    /** Populated when ok is false, so a failing key is diagnosable. */
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // The rate-limit query: this person's calls, newest first.
    index("llm_usage_owner_time_idx").on(t.ownerId, t.createdAt),
  ],
);

/* =============================================================================
   MATERIALS — Phases 2 and 3
   ==========================================================================*/

/**
 * One master resume per person, held as JSON rather than shredded across
 * tables: the shape changes every time the template does, and a jsonb column
 * absorbs that without a migration. Validation happens in Zod at the edge.
 *
 * TODO(Phase 2): define the ResumeData zod schema and mirror it here as
 * `$type<ResumeData>()`.
 */
export const resumeMaster = pgTable(
  "resume_master",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...ownership,
    data: jsonb("data").notNull().default({}),
    ...timestamps,
  },
  (t) => [uniqueIndex("resume_master_owner_idx").on(t.ownerId)],
);

/** A point-in-time resume: either a manual save or a JD-tailored rewrite. */
export const resumeVersion = pgTable(
  "resume_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...ownership,
    /** Set when this version was tailored for a specific role. */
    jobId: uuid("job_id").references(() => job.id, { onDelete: "set null" }),
    label: text("label").notNull(),
    data: jsonb("data").notNull().default({}),
    ...timestamps,
  },
  (t) => [
    index("resume_version_owner_idx").on(t.ownerId),
    index("resume_version_job_idx").on(t.jobId),
  ],
);

/* =============================================================================
   PIPELINE — Phases 4 and 5
   ==========================================================================*/

/** A saved search. Phase 5's agent runs these on a schedule. */
export const jobCriteria = pgTable(
  "job_criteria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...ownership,
    title: text("title").notNull(),
    keywords: text("keywords").array().notNull().default([]),
    location: text("location"),
    remote: boolean("remote").notNull().default(false),
    minSalary: integer("min_salary"),
    seniority: text("seniority"),
    ...timestamps,
  },
  (t) => [index("job_criteria_owner_idx").on(t.ownerId)],
);

/**
 * THE WATCHLIST — the companies discovery actually checks.
 *
 * Greenhouse and Lever have no global search: a board token *is* the query,
 * so without a list of tokens `discover()` has nothing to ask and returns
 * nothing. This table is that list.
 *
 * `careerpage` is the deliberate exception to "no scraping". It is one page,
 * belonging to one company the owner typed in themselves, fetched on a slow
 * schedule with robots.txt honoured — not a board walked with pagination.
 * The distinction is enforced by the runner, not by good intentions: see
 * `docs/DISCOVERY-PIPELINE.md`.
 *
 * `lastRunAt` / `lastError` exist so a board that has quietly 404'd for a
 * month is visible in the UI rather than just absent from the results.
 */
export const jobSource = pgTable(
  "job_source",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...ownership,
    kind: jobSourceKind("kind").notNull(),
    /** Display name — the company, as a person would say it. */
    label: text("label").notNull(),
    /**
     * The board token for greenhouse/lever, or the full https URL for a
     * careerpage. One column because exactly one of them is ever meaningful,
     * and `kind` already says which.
     */
    target: text("target").notNull(),
    /** Narrows this source only; empty means keep everything it returns. */
    keywords: text("keywords").array().notNull().default([]),
    enabled: boolean("enabled").notNull().default(true),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    lastError: text("last_error"),
    ...timestamps,
  },
  (t) => [
    index("job_source_owner_enabled_idx").on(t.ownerId, t.enabled),
    // The same board added twice is a mistake, not two sources.
    uniqueIndex("job_source_owner_kind_target_idx").on(
      t.ownerId,
      t.kind,
      t.target,
    ),
  ],
);

export const job = pgTable(
  "job",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...ownership,
    /** Which connector found it: greenhouse | lever | adzuna | manual. */
    source: text("source").notNull(),
    /** The provider's own id, used to avoid re-importing the same posting. */
    externalId: text("external_id"),
    title: text("title").notNull(),
    company: text("company"),
    url: text("url"),
    description: text("description"),
    /**
     * Kept as the feed's own string rather than parsed into a place.
     * "Remote, United States", "London or Berlin" and "Hybrid — 3 days" are
     * all real values, and normalising them loses more than it gains.
     */
    location: text("location"),
    remote: boolean("remote"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    /** 0–100. Null until scored. */
    matchScore: integer("match_score"),
    status: applicationStatus("status").notNull().default("found"),
    ...timestamps,
  },
  (t) => [
    index("job_owner_status_idx").on(t.ownerId, t.status),
    // Scoped by owner so two people can each hold the same posting.
    uniqueIndex("job_owner_source_external_idx").on(
      t.ownerId,
      t.source,
      t.externalId,
    ),
  ],
);

export const application = pgTable(
  "application",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...ownership,
    jobId: uuid("job_id")
      .notNull()
      .references(() => job.id, { onDelete: "cascade" }),
    /** Which resume actually went out — the question you cannot answer later. */
    resumeVersionId: uuid("resume_version_id").references(
      () => resumeVersion.id,
      { onDelete: "set null" },
    ),
    status: applicationStatus("status").notNull().default("applied"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("application_owner_status_idx").on(t.ownerId, t.status),
    index("application_job_idx").on(t.jobId),
  ],
);

/* =============================================================================
   TYPES — inferred, never hand-written
   ==========================================================================*/

export type Company = typeof company.$inferSelect;
export type NewCompany = typeof company.$inferInsert;
export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
export type WorkLog = typeof workLog.$inferSelect;
export type NewWorkLog = typeof workLog.$inferInsert;
export type ResumeMaster = typeof resumeMaster.$inferSelect;
export type ResumeVersion = typeof resumeVersion.$inferSelect;
export type JobCriteria = typeof jobCriteria.$inferSelect;
export type Job = typeof job.$inferSelect;
export type NewJob = typeof job.$inferInsert;
export type Application = typeof application.$inferSelect;
export type NewApplication = typeof application.$inferInsert;
export type ApplicationStatus = (typeof applicationStatus.enumValues)[number];
export type OrgKind = (typeof orgKind.enumValues)[number];
export type LlmUsage = typeof llmUsage.$inferSelect;
export type LogType = (typeof logType.enumValues)[number];
