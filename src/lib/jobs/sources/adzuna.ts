import type { JobSource } from "@/lib/jobs";

/**
 * Adzuna is the aggregator of the three: a real keyword/location search across
 * many boards, with a free developer tier. It needs an app id and key, which
 * is why it is the only source with a meaningful `isConfigured()`.
 *
 * TODO(Phase 4): implement against
 * `https://api.adzuna.com/v1/api/jobs/{country}/search/{page}`.
 */
export const adzunaSource: JobSource = {
  name: "adzuna",
  isConfigured() {
    return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
  },
  async search() {
    throw new Error("Not implemented until Phase 4 (Adzuna).");
  },
};
