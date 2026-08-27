"use client";

import * as React from "react";
import { Check, PenLine } from "lucide-react";

import { writeSummaryAction, type SummaryState } from "@/lib/resume/ai-actions";
import { Button } from "@/components/ui/button";
import {
  AiHeading,
  AiPanel,
  Attribution,
  Failure,
  Unverified,
  Working,
} from "@/components/resume/ai-shell";

/**
 * WRITES THE TWO HARDEST FIELDS ON THE PAGE
 * =========================================
 *
 * The headline and the summary are the parts everybody leaves blank, and they
 * are also the only parts that are pure synthesis — you cannot write them by
 * remembering one thing that happened, you have to read your own career and
 * say what it amounts to. That is genuinely hard from the inside and it is
 * exactly what a model reading the whole document is good at.
 *
 * Same contract as everywhere else: it proposes, you accept, the existing
 * Save button stores it. Nothing is written until you press the button you
 * were already going to press.
 */
export function AiSummary({
  onApply,
}: {
  /** Fills the two fields. Neither is saved until the form is submitted. */
  onApply: (draft: { headline: string; summary: string }) => void;
}) {
  const [state, run, pending] = React.useActionState<SummaryState, FormData>(
    writeSummaryAction,
    {},
  );
  const [open, setOpen] = React.useState(false);
  const [applied, setApplied] = React.useState(false);

  const [seen, setSeen] = React.useState(state.summary);
  if (seen !== state.summary) {
    setSeen(state.summary);
    setApplied(false);
  }

  const hasDraft = Boolean(state.headline || state.summary);

  return (
    <div className="space-y-2.5">
      <Button
        type="button"
        variant={open ? "zest" : "secondary"}
        size="sm"
        className="fx-tap"
        onClick={() => setOpen(!open)}
      >
        <PenLine className="h-3.5 w-3.5" strokeWidth={2.25} />
        Write these for me
      </Button>

      {open ? (
        <AiPanel>
          {pending ? (
            <Working label="Reading the whole resume and your journal…" />
          ) : hasDraft ? (
            <div className="space-y-3">
              <AiHeading title="A headline and a summary" />

              <div className="space-y-2">
                <div className="rounded-control border border-line bg-surface p-2.5">
                  <p className="t-slate mb-1">Headline</p>
                  <p className="text-[0.8125rem] font-semibold text-fg">
                    {state.headline || "—"}
                  </p>
                </div>
                <div className="rounded-control border border-line bg-surface p-2.5">
                  <p className="t-slate mb-1">Summary</p>
                  <p className="text-[0.8125rem] leading-relaxed text-fg">
                    {state.summary || "—"}
                  </p>
                </div>
              </div>

              <Unverified tokens={state.flagged ?? []} />

              {state.note ? (
                <p className="text-xs leading-relaxed text-fg-subtle">
                  <strong className="font-semibold text-fg-muted">
                    What it led with:
                  </strong>{" "}
                  {state.note}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="zest"
                  size="sm"
                  className="fx-tap"
                  disabled={applied}
                  onClick={() => {
                    onApply({
                      headline: state.headline ?? "",
                      summary: state.summary ?? "",
                    });
                    setApplied(true);
                  }}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {applied ? "Filled in — now save" : "Use both"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => React.startTransition(() => run(new FormData()))}
                >
                  Write another
                </Button>
              </div>

              <Attribution provider={state.provider} remaining={state.remaining} />
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[0.8125rem] leading-relaxed text-fg-muted">
                Reads every role and every journal entry, then writes the two
                lines that are hardest to write about yourself. Both land in
                the fields above for you to edit — nothing is saved until you
                press Save header.
              </p>
              {state.error ? <Failure message={state.error} /> : null}
              <Button
                type="button"
                variant="zest"
                size="sm"
                className="fx-tap"
                onClick={() => React.startTransition(() => run(new FormData()))}
              >
                <PenLine className="h-3.5 w-3.5" strokeWidth={2.25} />
                {state.error ? "Try again" : "Draft them"}
              </Button>
            </div>
          )}
        </AiPanel>
      ) : null}
    </div>
  );
}
