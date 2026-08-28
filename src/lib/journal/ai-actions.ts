"use server";

import { requireUser } from "@/lib/auth";
import { ProviderError, completeJson } from "@/lib/llm/providers";
import {
  RateLimited,
  describeReset,
  settleQuota,
  spendQuota,
} from "@/lib/llm/limit";
import { parseQuickEntry } from "@/lib/journal/quick-parse";
import {
  REFINE_SHAPE,
  REFINE_SYSTEM,
  refinedLogSchema,
  type RefinedLog,
} from "@/lib/journal/ai";

/**
 * THE REFINE STEP — between typing and filing
 * ===========================================
 *
 * Nothing here writes to the database, and that is the design. The action
 * returns a *proposal*; the entry only exists once the person reads it and
 * presses confirm, at which point the existing `createEntryAction` does the
 * storing exactly as if they had typed the refined version themselves. An
 * assistant that files entries directly is one that can quietly put words in
 * your record — and this record is the evidence the resume builder treats as
 * ground truth.
 *
 * The date never goes near the model. `parseQuickEntry` already resolves
 * "yesterday" and "on monday" deterministically, and date arithmetic is
 * precisely where small local models are least reliable — so the parser's
 * date rides through untouched and the model only ever sees the remainder
 * of the line.
 */

export interface RefineState {
  error?: string;
  rateLimited?: boolean;
  proposal?: RefinedLog;
  /** Resolved by the parser, not the model — see above. */
  date?: string;
  /** Echo of what was typed, so confirm can offer "use as typed" honestly. */
  raw?: string;
  provider?: string;
  remaining?: number;
}

export async function refineLogAction(
  _prev: RefineState,
  formData: FormData,
): Promise<RefineState> {
  await requireUser();

  const raw = String(formData.get("raw") ?? "").trim();
  if (raw.length < 8) {
    return {
      error: "Type a little more first — there is nothing to improve yet.",
    };
  }
  if (raw.length > 2000) {
    return { error: "That is longer than a journal entry wants to be." };
  }

  // Date out first, deterministically. The model gets the rest.
  const parsed = parseQuickEntry(raw);

  let usageId: string;
  try {
    usageId = await spendQuota("journal-refine");
  } catch (error) {
    if (error instanceof RateLimited) {
      return {
        rateLimited: true,
        error: `That is all ${error.quota.limit} model requests for now. They come back ${describeReset(error.quota)}.`,
      };
    }
    throw error;
  }

  try {
    const { value, provider } = await completeJson(
      {
        system: REFINE_SYSTEM,
        user: [
          `THE TYPED LINE:\n${parsed.title}`,
          `\nReturn JSON in exactly this shape:\n${REFINE_SHAPE}`,
        ].join("\n"),
        // Short-context rewriting: the task the local 3B measurably handles,
        // so the default self-hosted-first order stands. Low temperature —
        // this is filing, not writing.
        maxTokens: 900,
        temperature: 0.3,
      },
      (v) => refinedLogSchema.parse(v),
    );

    await settleQuota(usageId, { provider, ok: true });

    return {
      proposal: value,
      date: parsed.date,
      raw,
      provider,
    };
  } catch (error) {
    await settleQuota(usageId, {
      provider: error instanceof ProviderError ? error.provider : "unknown",
      ok: false,
      error: (error as Error).message,
    });
    return {
      error:
        "No model could improve that right now. It is saved nowhere — log it as typed, or try again.",
      raw,
    };
  }
}
