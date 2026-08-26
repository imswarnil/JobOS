import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { company, project } from "@/lib/db/schema";
import { ownerId } from "@/lib/auth/scope";

export type Org = Awaited<ReturnType<typeof listOrgs>>[number];
export type Proj = Awaited<ReturnType<typeof listProjects>>[number];

/**
 * Every organisation this person has attached work to, current ones first —
 * because the composer's default is "wherever I am now", and a list that
 * buries it under three old employers makes that default hard to trust.
 */
export async function listOrgs() {
  const db = getDb();
  const owner = await ownerId();

  return db
    .select({
      id: company.id,
      name: company.name,
      kind: company.kind,
      isCurrent: company.isCurrent,
      role: company.role,
      startDate: company.startDate,
      endDate: company.endDate,
      notes: company.notes,
    })
    .from(company)
    .where(eq(company.ownerId, owner))
    .orderBy(desc(company.isCurrent), asc(company.name));
}

export async function listProjects() {
  const db = getDb();
  const owner = await ownerId();

  return db
    .select({
      id: project.id,
      name: project.name,
      companyId: project.companyId,
      description: project.description,
      startDate: project.startDate,
      endDate: project.endDate,
    })
    .from(project)
    .where(eq(project.ownerId, owner))
    .orderBy(asc(project.name));
}

/** The composer's default. Null when nothing is marked current. */
export async function currentOrgId(): Promise<string | null> {
  const db = getDb();
  const owner = await ownerId();

  const [row] = await db
    .select({ id: company.id })
    .from(company)
    .where(and(eq(company.ownerId, owner), eq(company.isCurrent, true)))
    .orderBy(asc(company.name))
    .limit(1);

  return row?.id ?? null;
}
