import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth";
import { ownerId } from "@/lib/auth/scope";
import { getDb } from "@/lib/db";
import {
  application,
  company,
  job,
  jobCriteria,
  project,
  resumeMaster,
  resumeVersion,
  workLog,
} from "@/lib/db/schema";

/**
 * Export everything this account owns, as one JSON file.
 *
 * "Your career record is yours" has to be a feature, not a support request —
 * so this is a plain authenticated GET that streams every owner-scoped table,
 * with no rate limit and nothing held back.
 *
 * Every query filters on the session's owner id. There is no parameter a
 * caller could change to export somebody else's data.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  const owner = await ownerId();
  const db = getDb();

  const [
    companies,
    projects,
    logs,
    master,
    versions,
    criteria,
    jobs,
    applications,
  ] = await Promise.all([
    db.select().from(company).where(eq(company.ownerId, owner)),
    db.select().from(project).where(eq(project.ownerId, owner)),
    db.select().from(workLog).where(eq(workLog.ownerId, owner)),
    db.select().from(resumeMaster).where(eq(resumeMaster.ownerId, owner)),
    db.select().from(resumeVersion).where(eq(resumeVersion.ownerId, owner)),
    db.select().from(jobCriteria).where(eq(jobCriteria.ownerId, owner)),
    db.select().from(job).where(eq(job.ownerId, owner)),
    db.select().from(application).where(eq(application.ownerId, owner)),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    formatVersion: 1,
    account: { id: user.id, name: user.name, email: user.email },
    companies,
    projects,
    workLogs: logs,
    resumeMaster: master,
    resumeVersions: versions,
    jobCriteria: criteria,
    jobs,
    applications,
  };

  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="jobos-export-${stamp}.json"`,
      // A career record is not something a CDN should hold on to.
      "cache-control": "no-store",
    },
  });
}
