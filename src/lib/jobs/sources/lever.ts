import type { JobSource } from "@/lib/jobs";

/**
 * Lever publishes the same way as Greenhouse: one public JSON feed per
 * company at `https://api.lever.co/v0/postings/{company}?mode=json`.
 * Also per-company, also no credentials, also needs a watchlist.
 *
 * TODO(Phase 4): implement.
 */
export const leverSource: JobSource = {
  name: "lever",
  isConfigured() {
    return false;
  },
  async search() {
    throw new Error("Not implemented until Phase 4 (Lever).");
  },
};
