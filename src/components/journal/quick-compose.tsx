"use client";

import * as React from "react";
import { CornerDownLeft, Loader2, Plus, Sparkles } from "lucide-react";

import { createEntryAction, type EntryFormState } from "@/lib/journal/actions";
import {
  describeDate,
  parseQuickEntry,
  typeMeta,
} from "@/lib/journal/quick-parse";
import { cn } from "@/lib/utils";

/**
 * ONE BOX, ALWAYS THERE
 * =====================
 *
 * The journal only works if you write in it, and the thing that stops people
 * is not difficulty — it is the form. Ten fields look like ten fields even
 * when nine are optional, and the entry you skip because it looked like
 * paperwork is the one that mattered.
 *
 * So: a single line, already focused, and Enter files it. Type defaults to
 * `work`, date to today, company to wherever you currently work. Everything
 * else moves out of "writing an entry" and into "improving an entry" —
 * something you do when you have a minute, not a toll on the way in.
 *
 * The hint under the box is not decoration. The parser lifts dates and infers
 * types out of what you typed, and a parser you cannot see is one that will
 * quietly file something under the wrong day and be discovered months later
 * when the resume is wrong. Showing its reading before you commit makes a
 * wrong guess a thing you correct in a second rather than a thing you never
 * learn about.
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

  const [value, setValue] = React.useState("");

  /**
   * Cleared by remount rather than by resetting through a ref.
   *
   * `saves` increments on every confirmed write, so two identical entries in
   * a row both clear — keying on `state.ok` alone would not, since it stays
   * true across consecutive successes.
   */
  const [saves, setSaves] = React.useState(0);
  const [handled, setHandled] = React.useState(false);
  if (state.ok && !handled) {
    setHandled(true);
    setSaves((n) => n + 1);
    setValue("");
  } else if (!state.ok && handled) {
    setHandled(false);
  }

  // Parsed on every keystroke. Pure and tiny — no debounce needed, and a
  // debounced hint would lag behind the text it is describing.
  const parsed = React.useMemo(() => parseQuickEntry(value), [value]);
  const meta = typeMeta(parsed.type);
  const Icon = meta.icon;
  const ready = parsed.title.length >= 2;

  return (
    <form action={formAction} className="relative">
      <input type="hidden" name="type" value={parsed.type} />
      <input type="hidden" name="occurredOn" value={parsed.date} />
      <input type="hidden" name="title" value={parsed.title} />
      {currentCompanyId ? (
        <input type="hidden" name="companyId" value={currentCompanyId} />
      ) : null}

      <div
        className={cn(
          "flex items-center gap-3 rounded-card border bg-surface px-4 py-3 shadow-e1",
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
          maxLength={200}
          aria-label="What happened?"
          placeholder="What happened? — “fixed the migration yesterday”"
          className="min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-faint"
        />

        <button
          type="submit"
          disabled={!ready || pending}
          aria-label="Save entry"
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

      {/* The parser's reading, and the way into the long form. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
        {ready ? (
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
            Enter saves it. Say “yesterday” or “on monday” and it files itself.
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
        <p
          role="alert"
          className="fx-wiggle mt-2 px-1 text-xs text-danger-fg"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
