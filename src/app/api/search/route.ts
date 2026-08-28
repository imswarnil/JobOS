import { NextResponse } from "next/server";

import { IngestAuthError, requireIngestOwner } from "@/lib/ingest/auth";
import { runSavedSearches } from "@/lib/jobs/search-runner";

/**
 * The scheduled title search.
 *
 * `POST /api/search` with the ingest bearer token runs every saved search for
 * the configured account and stores what is new. Meant to be called on a
 * schedule — three-hourly is the intent, and `dateRestrict=d1` in the
 * connector means each run only asks Google for pages indexed since
 * yesterday, so a frequent schedule stays cheap instead of re-returning the
 * same evergreen results.
 *
 * It shares `INGEST_TOKEN` with `/api/ingest/*` deliberately. Both are the
 * same kind of caller — the machine on the VPS — and a second secret would be
 * a second thing to rotate and leak for no additional isolation.
 *
 * Who calls it: n8n on the VPS is the natural home, since it already runs the
 * watchlist workflow and a Schedule node is one drag. A Vercel cron works too
 * on a plan that allows sub-daily schedules. Either way the work is bounded —
 * see `FETCH_BUDGET` in the runner — so this returns in about a minute rather
 * than running until it is killed.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
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

  try {
    const result = await runSavedSearches(owner);
    // 200 even with errors in the body: partial success is the normal case —
    // one title's quota being spent should not present as the whole run
    // failing, and n8n branching on the status code would then retry work
    // that already succeeded.
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
