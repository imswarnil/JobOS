"use client";

import * as React from "react";
import {
  Check,
  CornerDownLeft,
  Loader2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

import { createEntryAction, type EntryFormState } from "@/lib/journal/actions";
import { refineLogAction, type RefineState } from "@/lib/journal/ai-actions";
import {
  describeDate,
  parseQuickEntry,
  typeMeta,
} from "@/lib/journal/quick-parse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ONE BOX, ALWAYS THERE — AND A FILING CLERK BEHIND IT
 * ====================================================
 *
 * Two ways out of the box, both one gesture:
 *
 *   Enter      files the line as-is. Parser picks the date, verb table
 *              guesses the type. Instant, free, never wrong in a way you
 *              did not watch happen.
 *
 *   Sparkle    hands the line to the model chain (local first) and comes
 *              back with a *proposal*: sharpened title, type chosen by
 *              meaning, technologies pulled into tags, outcome separated
 *              into impact. Nothing is saved until you read it and press
 *              "Log it" — the proposal card is the confirmation step, not
 *              a preview of something already done.
 *
 * The confirm step is the safety, not a formality. The journal is the
 * evidence the resume builder treats as ground truth, so a model must never
 * write into it unread. Both paths end in the same `createEntryAction`,
 * exactly as if you had typed the refined version yourself.
 */
export function QuickCompose({
  currentCompanyId,
  onExpand,
}: {
  /** Whatever is starred in Career setup — the default for a new entry. */
  currentCompanyId?: string | null;
  /** Opens the full form, carrying whatever has been typed so far. */
  onExpand: (draft: string) => void;
}) {
  const [state, formAction, pending] = React.useActionState<
    EntryFormState,
    FormData
  >(createEntryAction, {});
  const [refine, refineAction, refining] = React.useActionState<
    RefineState,
    FormData
  >(refineLogAction, {});

  const [value, setValue] = React.useState("");

  /** Increments on every confirmed save — clears the box and retires any
   *  proposal card, keyed rather than reset through refs. */
  const [saves, setSaves] = React.useState(0);
  const [handled, setHandled] = React.useState(false);
  if (state.ok && !handled) {
    setHandled(true);
    setSaves((n) => n + 1);
    setValue("");
  } else if (!state.ok && handled) {
    setHandled(false);
  }

  /** Which save-generation the current proposal belongs to. A proposal from
   *  before the last save is stale and must not linger on screen. */
  const [proposalFor, setProposalFor] = React.useState(-1);
  const [dismissed, setDismissed] = React.useState(false);
  const [seenProposal, setSeenProposal] = React.useState(refine.proposal);
  if (seenProposal !== refine.proposal) {
    setSeenProposal(refine.proposal);
    setProposalFor(saves);
    setDismissed(false);
  }

  const parsed = React.useMemo(() => parseQuickEntry(value), [value]);
  const meta = typeMeta(parsed.type);
  const Icon = meta.icon;
  const ready = parsed.title.length >= 2;

  const proposal =
    refine.proposal && proposalFor === saves && !dismissed
      ? refine.proposal
      : null;
  const proposalMeta = proposal ? typeMeta(proposal.type) : null;

  function runRefine() {
    const fd = new FormData();
    fd.set("raw", value);
    React.startTransition(() => refineAction(fd));
  }

  return (
    <div className="space-y-2">
      <form action={formAction} className="relative">
        <input type="hidden" name="type" value={parsed.type} />
        <input type="hidden" name="occurredOn" value={parsed.date} />
        <input type="hidden" name="title" value={parsed.title} />
        {currentCompanyId ? (
          <input type="hidden" name="companyId" value={currentCompanyId} />
        ) : null}

        <div
          className={cn(
            "flex items-center gap-2.5 rounded-card border bg-surface px-4 py-3 shadow-e1",
            "transition-[border-color,box-shadow] duration-(--animate-duration-1) ease-out",
            "focus-within:border-line-accent focus-within:shadow-e2",
            ready ? "border-line-strong" : "border-line",
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5 shrink-0 transition-colors duration-(--animate-duration-2) ease-out",
              ready ? "text-accent" : "text-fg-faint",
            )}
            strokeWidth={2}
          />

          <input
            key={`q-${saves}`}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={2000}
            aria-label="What happened?"
            placeholder="What happened? — “fixed the migration yesterday”"
            className="min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-faint"
          />

          {/* The clerk. Only offered once there is something to file. */}
          {ready ? (
            <button
              type="button"
              onClick={runRefine}
              disabled={refining || pending}
              aria-label="Improve and categorise with AI"
              title="Improve and categorise — you confirm before it saves"
              className={cn(
                "fx-tap grid h-9 w-9 shrink-0 place-items-center rounded-control",
                "border border-zest-line/50 bg-zest-soft text-zest-soft-fg",
                "disabled:opacity-50",
              )}
            >
              {refining ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
              ) : (
                <Sparkles className="h-4 w-4" strokeWidth={2.25} />
              )}
            </button>
          ) : null}

          <button
            type="submit"
            disabled={!ready || pending}
            aria-label="Save entry as typed"
            className={cn(
              "fx-tap grid h-9 w-9 shrink-0 place-items-center rounded-control",
              "transition-[background-color,opacity] duration-(--animate-duration-1) ease-out",
              ready
                ? "bg-heat text-fg-on-accent shadow-e1"
                : "bg-muted text-fg-faint",
              "disabled:cursor-default",
            )}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
            ) : (
              <CornerDownLeft className="h-4 w-4" strokeWidth={2.5} />
            )}
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
          {refining ? (
            <span className="fx-fade flex items-center gap-1.5 text-xs text-fg-muted">
              <Sparkles className="h-3 w-3 text-zest" strokeWidth={2.5} />
              Reading it… local models take a moment.
            </span>
          ) : ready ? (
            <span className="fx-fade flex items-center gap-1.5 text-xs text-fg-muted">
              <Sparkles className="h-3 w-3 text-zest" strokeWidth={2.5} />
              Filing as{" "}
              <strong className="font-semibold text-fg">
                {meta.label.toLowerCase()}
              </strong>
              {parsed.inferredType ? null : " (default)"} on{" "}
              <strong className="font-semibold text-fg">
                {describeDate(parsed.date)}
              </strong>
              {parsed.matchedDate ? (
                <span className="text-fg-faint">
                  — from “{parsed.matchedDate}”
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-xs text-fg-subtle">
              Enter saves it as typed. The{" "}
              <Sparkles
                className="inline h-3 w-3 text-zest"
                strokeWidth={2.5}
                aria-hidden
              />{" "}
              improves and categorises it first — you confirm.
            </span>
          )}

          <button
            type="button"
            onClick={() => onExpand(value)}
            className="ml-auto flex items-center gap-1 text-xs font-semibold text-fg-subtle hover:text-fg"
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} />
            Add detail
          </button>
        </div>

        {state.error ? (
          <p role="alert" className="fx-wiggle mt-2 px-1 text-xs text-danger-fg">
            {state.error}
          </p>
        ) : null}
        {refine.error && !proposal ? (
          <p role="alert" className="fx-wiggle mt-2 px-1 text-xs text-danger-fg">
            {refine.error}
          </p>
        ) : null}
      </form>

      {/* ── The proposal: read it, then log it. Its own form, because both
          paths end in the same createEntryAction and forms cannot nest. ── */}
      {proposal && proposalMeta ? (
        <form
          action={formAction}
          className="edge-spark fx-bounce relative overflow-hidden rounded-card border border-zest-line/40 bg-zest-soft/30 p-4"
        >
          <input type="hidden" name="type" value={proposal.type} />
          <input
            type="hidden"
            name="occurredOn"
            value={refine.date ?? parsed.date}
          />
          <input type="hidden" name="title" value={proposal.title} />
          <input type="hidden" name="body" value={proposal.body} />
          <input type="hidden" name="impact" value={proposal.impact} />
          <input
            type="hidden"
            name="techTags"
            value={proposal.techTags.join(", ")}
          />
          {currentCompanyId ? (
            <input type="hidden" name="companyId" value={currentCompanyId} />
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="zest">
              <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} />
              Proposed
            </Badge>
            <Badge tone="accent">{proposalMeta.label}</Badge>
            <span className="t-slate">
              {describeDate(refine.date ?? parsed.date)}
            </span>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss proposal"
              className="fx-tap ml-auto grid h-7 w-7 place-items-center rounded-control text-fg-faint hover:bg-surface hover:text-fg"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
          </div>

          <p className="mt-2.5 text-[0.9375rem] leading-snug font-semibold text-fg">
            {proposal.title}
          </p>

          {proposal.body ? (
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
              {proposal.body}
            </p>
          ) : null}

          {proposal.impact ? (
            <p className="mt-1.5 border-l-2 border-zest-line pl-2.5 text-sm leading-relaxed text-fg-muted">
              <span className="t-slate mr-1.5">Impact</span>
              {proposal.impact}
            </p>
          ) : null}

          {proposal.techTags.length ? (
            <ul className="mt-2 flex flex-wrap gap-1">
              {proposal.techTags.map((tag) => (
                <li key={tag}>
                  <span className="inline-block rounded-pill border border-line bg-surface px-2 py-0.5 text-[0.6875rem] font-medium text-fg-muted">
                    {tag}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zest-line/30 pt-3">
            <Button
              type="submit"
              variant="zest"
              size="sm"
              className="fx-tap"
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
              ) : (
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              )}
              Log it
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={runRefine}
              disabled={refining}
            >
              Try again
            </Button>
            <span className="ml-auto text-[0.6875rem] text-fg-faint">
              {proposal.note ? `${proposal.note} · ` : ""}by{" "}
              {refine.provider ?? "the chain"}
              {refine.provider === "ollama" ? " — on your hardware" : ""}
            </span>
          </div>
        </form>
      ) : null}
    </div>
  );
}
