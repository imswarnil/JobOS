import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { IngestAuthError, requireIngestOwner } from "@/lib/ingest/auth";
import { getDb } from "@/lib/db";
import { jobSource } from "@/lib/db/schema";

/**
 * The watchlist the discovery runner works from.
 *
 * This is what makes the n8n workflow a runner rather than a configuration
 * file: the list of companies lives in JobOS, is edited in JobOS, and n8n
 * asks for it at the top of every run. Adding a company should never mean
 * opening n8n.
 *
 * Only enabled sources are returned. Disabling one in the UI is expected to
 * stop it being checked on the very next run, with no deploy and no edit
 * anywhere else.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let owner: string;
  try {
    owner = requireIngestOwner(request);
  } catch (error) {
    if (error instanceof IngestAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    throw error;
  }

  const db = getDb();
  const sources = await db
    .select({
      id: jobSource.id,
      kind: jobSource.kind,
      label: jobSource.label,
      target: jobSource.target,
      keywords: jobSource.keywords,
    })
    .from(jobSource)
    .where(and(eq(jobSource.ownerId, owner), eq(jobSource.enabled, true)));

  return NextResponse.json(
    { sources },
    // A runner must never be served a cached watchlist — the whole point is
    // that disabling a source takes effect on the next run.
    { headers: { "cache-control": "no-store" } },
  );
}
