"use client";

import * as React from "react";
import { Check, NotebookPen, Plus, Wand2 } from "lucide-react";

import {
  draftBulletsAction,
  strengthenBulletAction,
  type DraftState,
  type StrengthenState,
} from "@/lib/resume/ai-actions";
import { cn } from "@/lib/utils";
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
 * THE ASSISTANT, IN THE ENTRY FORM
 * ================================
 *
 * Two buttons under the bullets box, and they are the two halves of the same
 * problem:
 *
 *   Draft     you cannot remember what you did at that job. The journal can.
 *   Sharpen   you remember perfectly and wrote it badly.
 *
 * Neither writes to the document. They propose; you click to accept; the
 * text lands in the textarea you were already editing and the existing save
 * button stores it. That indirection is the point — an assistant that edits
 * the resume itself can change a sentence you would not have signed, and you
 * find out in an interview rather than in the editor.
 *
 * `onInsert` and `readBullets` talk to the textarea by ref rather than
 * lifting it into state. The form is uncontrolled everywhere else and making
 * this one field controlled, purely so a side panel can read it, would put a
 * re-render on every keystroke of the most-typed field on the page.
 */

export function AiAssist({
  title,
  subtitle,
  readBullets,
  onInsert,
  onReplace,
}: {
  /** Live values, read at click time rather than captured at render. */
  title: () => string;
  subtitle: () => string;
  readBullets: () => string[];
  onInsert: (lines: string[]) => void;
  onReplace: (original: string, replacement: string) => void;
}) {
  const [mode, setMode] = React.useState<"idle" | "draft" | "sharpen">("idle");

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={mode === "draft" ? "zest" : "secondary"}
          size="sm"
          className="fx-tap"
          onClick={() => setMode(mode === "draft" ? "idle" : "draft")}
        >
          <NotebookPen className="h-3.5 w-3.5" strokeWidth={2.25} />
          Draft from journal
        </Button>
        <Button
          type="button"
          variant={mode === "sharpen" ? "zest" : "secondary"}
          size="sm"
          className="fx-tap"
          onClick={() => setMode(mode === "sharpen" ? "idle" : "sharpen")}
        >
          <Wand2 className="h-3.5 w-3.5" strokeWidth={2.25} />
          Sharpen a bullet
        </Button>
      </div>

      {mode === "draft" ? (
        <DraftPanel
          title={title}
          subtitle={subtitle}
          readBullets={readBullets}
          onInsert={onInsert}
        />
      ) : null}

      {mode === "sharpen" ? (
        <SharpenPanel
          title={title}
          subtitle={subtitle}
          readBullets={readBullets}
          onReplace={onReplace}
        />
      ) : null}
    </div>
  );
}

/* ── Draft ───────────────────────────────────────────────────────────────── */

function DraftPanel({
  title,
  subtitle,
  readBullets,
  onInsert,
}: {
  title: () => string;
  subtitle: () => string;
  readBullets: () => string[];
  onInsert: (lines: string[]) => void;
}) {
  const [state, run, pending] = React.useActionState<DraftState, FormData>(
    draftBulletsAction,
    {},
  );

  // Which proposals are ticked. Keyed by index, which is stable because the
  // list only changes when a new run replaces it wholesale.
  const [picked, setPicked] = React.useState<Set<number>>(new Set());
  const [added, setAdded] = React.useState(false);

  // A fresh result invalidates the old selection. Adjusted during render
  // rather than in an effect, so the new list never paints with the previous
  // run's ticks still on it.
  const [seen, setSeen] = React.useState(state.bullets);
  if (seen !== state.bullets) {
    setSeen(state.bullets);
    setPicked(new Set());
    setAdded(false);
  }

  function submit() {
    const form = new FormData();
    form.set("title", title());
    form.set("subtitle", subtitle());
    form.set("bullets", readBullets().join("\n"));
    React.startTransition(() => run(form));
  }

  const bullets = state.bullets ?? [];

  return (
    <AiPanel>
      {pending ? (
        <Working label="Reading your journal for this role…" />
      ) : bullets.length ? (
        <div className="space-y-3">
          <AiHeading
            title={`${bullets.length} bullet${bullets.length === 1 ? "" : "s"} your journal supports`}
            hint={
              state.drawnFrom
                ? `from ${state.drawnFrom} ${state.drawnFrom === 1 ? "entry" : "entries"}`
                : undefined
            }
          />

          <ul className="fx-cascade space-y-2">
            {bullets.map((bullet, i) => {
              const on = picked.has(i);
              return (
                <li key={i} style={{ "--i": i } as React.CSSProperties}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-control border bg-surface p-2.5",
                      "transition-[border-color,background-color] duration-(--animate-duration-1) ease-out",
                      on
                        ? "border-zest bg-zest-soft/60"
                        : "border-line hover:border-zest-line",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setPicked((prev) => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        })
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--zest)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.8125rem] leading-relaxed text-fg">
                        {bullet.text}
                      </span>
                      <span className="mt-1 block text-[0.6875rem] leading-relaxed text-fg-subtle">
                        <strong className="font-semibold">Because:</strong>{" "}
                        {bullet.basis}
                      </span>
                      <Unverified tokens={state.flagged?.[i] ?? []} />
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="zest"
              size="sm"
              className="fx-tap"
              disabled={!picked.size || added}
              onClick={() => {
                onInsert([...picked].sort((a, b) => a - b).map((i) => bullets[i].text));
                setAdded(true);
              }}
            >
              {added ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              ) : (
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              )}
              {added
                ? "Added — remember to save"
                : `Add ${picked.size || ""} to bullets`.trim()}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={submit}>
              Try again
            </Button>
          </div>

          <Attribution provider={state.provider} remaining={state.remaining} />
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-[0.8125rem] leading-relaxed text-fg-muted">
            Reads every journal entry filed under this employer and proposes
            bullets for the ones the resume does not already mention. Each one
            arrives with the entry it came from, so you can check it rather
            than trust it.
          </p>
          {state.note ? (
            <p className="text-xs leading-relaxed text-fg-subtle">{state.note}</p>
          ) : null}
          {state.error ? <Failure message={state.error} /> : null}
          <Button
            type="button"
            variant="zest"
            size="sm"
            className="fx-tap"
            onClick={submit}
          >
            <NotebookPen className="h-3.5 w-3.5" strokeWidth={2.25} />
            {state.error ? "Try again" : "Draft bullets"}
          </Button>
        </div>
      )}
    </AiPanel>
  );
}

/* ── Sharpen ─────────────────────────────────────────────────────────────── */

function SharpenPanel({
  title,
  subtitle,
  readBullets,
  onReplace,
}: {
  title: () => string;
  subtitle: () => string;
  readBullets: () => string[];
  onReplace: (original: string, replacement: string) => void;
}) {
  const [state, run, pending] = React.useActionState<StrengthenState, FormData>(
    strengthenBulletAction,
    {},
  );

  // Read once when the panel opens. Re-reading on every render would make the
  // list jump around while the user edits the textarea behind the panel.
  const [lines] = React.useState(() => readBullets());
  const [chosen, setChosen] = React.useState(0);
  const [applied, setApplied] = React.useState(false);

  const [seen, setSeen] = React.useState(state.variants);
  if (seen !== state.variants) {
    setSeen(state.variants);
    setApplied(false);
  }

  if (!lines.length) {
    return (
      <AiPanel>
        <p className="text-[0.8125rem] leading-relaxed text-fg-muted">
          Write a bullet first — this rewrites what is there, it does not
          invent what is not. Use <strong className="font-semibold">Draft
          from journal</strong> if you are starting from nothing.
        </p>
      </AiPanel>
    );
  }

  function submit() {
    const form = new FormData();
    form.set("bullet", lines[chosen] ?? "");
    form.set("title", title());
    form.set("subtitle", subtitle());
    React.startTransition(() => run(form));
  }

  const variants = state.variants ?? [];

  return (
    <AiPanel>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="t-slate">Which bullet</p>
          <div className="space-y-1">
            {lines.map((line, i) => (
              <label
                key={i}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-control border px-2.5 py-2",
                  "transition-colors duration-(--animate-duration-1) ease-out",
                  chosen === i
                    ? "border-zest bg-surface"
                    : "border-transparent hover:bg-surface/70",
                )}
              >
                <input
                  type="radio"
                  name="sharpen-target"
                  checked={chosen === i}
                  onChange={() => setChosen(i)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--zest)]"
                />
                <span className="text-xs leading-relaxed text-fg-muted">{line}</span>
              </label>
            ))}
          </div>
        </div>

        {pending ? <Working label="Looking for a stronger way to say it…" /> : null}
        {state.error ? <Failure message={state.error} /> : null}

        {!pending && variants.length ? (
          <div className="space-y-2.5">
            {state.diagnosis ? (
              <p className="rounded-control border border-line bg-surface px-2.5 py-2 text-xs leading-relaxed text-fg-muted">
                <strong className="font-semibold text-fg">What is weak:</strong>{" "}
                {state.diagnosis}
              </p>
            ) : null}

            <AiHeading title="Pick one, or keep yours" />

            <ul className="fx-cascade space-y-2">
              {variants.map((variant, i) => (
                <li
                  key={i}
                  style={{ "--i": i } as React.CSSProperties}
                  className="rounded-control border border-line bg-surface p-2.5"
                >
                  <p className="text-[0.8125rem] leading-relaxed text-fg">
                    {variant.text}
                  </p>
                  {variant.note ? (
                    <p className="mt-1 text-[0.6875rem] text-fg-subtle">
                      {variant.note}
                    </p>
                  ) : null}
                  <Unverified tokens={state.flagged?.[i] ?? []} />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="fx-tap mt-2"
                    disabled={applied}
                    onClick={() => {
                      onReplace(state.target ?? lines[chosen], variant.text);
                      setApplied(true);
                    }}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Use this one
                  </Button>
                </li>
              ))}
            </ul>

            <Attribution provider={state.provider} remaining={state.remaining} />
          </div>
        ) : null}

        {!pending ? (
          <Button
            type="button"
            variant="zest"
            size="sm"
            className="fx-tap"
            onClick={submit}
          >
            <Wand2 className="h-3.5 w-3.5" strokeWidth={2.25} />
            {variants.length ? "Rewrite again" : "Rewrite three ways"}
          </Button>
        ) : null}
      </div>
    </AiPanel>
  );
}
