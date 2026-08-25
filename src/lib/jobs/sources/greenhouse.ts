import type { JobSource } from "@/lib/jobs";

/**
 * Greenhouse job boards expose a public, unauthenticated JSON endpoint per
 * company: `https://boards-api.greenhouse.io/v1/boards/{token}/jobs`.
 *
 * There is no global search — you follow a list of board tokens. So this
 * connector needs a curated list of companies worth watching, which is a
 * Phase 4 settings screen rather than a credential.
 *
 * TODO(Phase 4): implement; read board tokens from job_criteria or a
 * dedicated watchlist table.
 */
export const greenhouseSource: JobSource = {
  name: "greenhouse",
  isConfigured() {
    return false;
  },
  async search() {
    throw new Error("Not implemented until Phase 4 (Greenhouse).");
  },
};
