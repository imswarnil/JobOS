"use client";

import * as React from "react";
import { Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

import { saveLayoutAction, type ResumeFormState } from "@/lib/resume/actions";
import {
  HEADER_FIELDS,
  HEADER_FIELD_META,
  LAYOUTS,
  LAYOUT_META,
  THEMES,
  THEME_META,
  type HeaderField,
  type ResumeLayoutConfig,
} from "@/lib/resume/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Layout and header arrangement.
 *
 * The three styles differ in density and typeface, never in structure — every
 * one is single-column, because a two-column resume is read interleaved by an
 * ATS and arrives as nonsense. That constraint is stated in the UI rather
 * than silently enforced, so nobody goes looking for the two-column option.
 *
 * Header fields are checkboxes *plus* order controls, because "which details
 * appear" and "in what order" are genuinely different questions and merging
 * them into a drag list answers neither clearly.
 */
export function LayoutPanel({ layout }: { layout: ResumeLayoutConfig }) {
  const [state, formAction, pending] = React.useActionState<
    ResumeFormState,
    FormData
  >(saveLayoutAction, {});

  const [style, setStyle] = React.useState(layout.style);
  const [theme, setTheme] = React.useState(layout.theme);
  const [order, setOrder] = React.useState<HeaderField[]>(() => {
    // Chosen fields first in their saved order, then the rest so they can be
    // switched back on without losing where they belong.
    const chosen = layout.header.filter((f) => HEADER_FIELDS.includes(f));
    const rest = HEADER_FIELDS.filter((f) => !chosen.includes(f));
    return [...chosen, ...rest];
  });
  const [on, setOn] = React.useState<Set<HeaderField>>(
    () => new Set(layout.header),
  );

  function move(field: HeaderField, by: number) {
    setOrder((prev) => {
      const i = prev.indexOf(field);
      const j = i + by;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <Card>
      <form action={formAction}>
        <input type="hidden" name="style" value={style} />
        <input type="hidden" name="theme" value={theme} />

        <CardHeader>
          <CardTitle>Layout</CardTitle>
          <CardDescription>
            All three are single column — a two-column resume gets read
            interleaved by an applicant tracking system and arrives as
            nonsense. What changes is density and typeface.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-3">
            {LAYOUTS.map((id) => {
              const meta = LAYOUT_META[id];
              const active = id === style;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStyle(id)}
                  aria-pressed={active}
                  className={cn(
                    "fx-press rounded-control border p-3 text-left transition-colors duration-200 ease-out",
                    active
                      ? "border-line-accent bg-accent-soft"
                      : "border-line bg-surface hover:border-line-strong hover:bg-sunken",
                  )}
                >
                  <span
                    className={cn(
                      "block text-sm font-semibold",
                      active ? "text-accent-soft-fg" : "text-fg",
                    )}
                  >
                    {meta.label}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-fg-subtle">
                    {meta.hint}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-fg">Finish</p>
            <p className="text-xs text-fg-subtle">
              How headings and rules are drawn. Colour here is decoration —
              nothing in the document is told apart by it alone, so all four
              survive a monochrome printer.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {THEMES.map((id) => {
                const meta = THEME_META[id];
                const active = id === theme;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTheme(id)}
                    aria-pressed={active}
                    className={cn(
                      "fx-press rounded-control border p-3 text-left transition-colors duration-200 ease-out",
                      active
                        ? "border-line-accent bg-accent-soft"
                        : "border-line bg-surface hover:border-line-strong hover:bg-sunken",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-sm font-semibold",
                        active ? "text-accent-soft-fg" : "text-fg",
                      )}
                    >
                      {meta.label}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-fg-subtle">
                      {meta.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-fg">
              Details under your name
            </p>
            <p className="text-xs text-fg-subtle">
              Shown in this order. Turn off anything you would rather not hand
              to a stranger.
            </p>

            <ul className="space-y-1.5">
              {order.map((field, i) => {
                const enabled = on.has(field);
                return (
                  <li
                    key={field}
                    className={cn(
                      "flex items-center gap-2 rounded-control border px-3 py-2",
                      enabled
                        ? "border-line bg-surface"
                        : "border-line-subtle bg-sunken/40",
                    )}
                  >
                    <label className="flex flex-1 items-center gap-2.5">
                      <input
                        type="checkbox"
                        name="header"
                        value={field}
                        checked={enabled}
                        onChange={(e) =>
                          setOn((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(field);
                            else next.delete(field);
                            return next;
                          })
                        }
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      <span
                        className={cn(
                          "text-[0.8125rem]",
                          enabled ? "text-fg" : "text-fg-faint",
                        )}
                      >
                        {HEADER_FIELD_META[field]}
                      </span>
                    </label>

                    <div className="flex items-center gap-0.5">
                      <OrderButton
                        label={`Move ${HEADER_FIELD_META[field]} up`}
                        disabled={i === 0}
                        onClick={() => move(field, -1)}
                      >
                        <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
                      </OrderButton>
                      <OrderButton
                        label={`Move ${HEADER_FIELD_META[field]} down`}
                        disabled={i === order.length - 1}
                        onClick={() => move(field, 1)}
                      >
                        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
                      </OrderButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              name="showSummary"
              defaultChecked={layout.showSummary}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span className="text-[0.8125rem] text-fg">
              Include the summary paragraph
            </span>
          </label>

          {state.error ? (
            <p role="alert" className="text-xs text-danger-fg">
              {state.error}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="justify-between">
          <p className="text-xs text-fg-subtle" aria-live="polite">
            {state.ok ? (
              <span className="flex items-center gap-1.5 text-success-fg">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Saved.
              </span>
            ) : (
              "Applies to the preview and the export."
            )}
          </p>
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
            ) : null}
            Save layout
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function OrderButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-control text-fg-faint",
        "transition-colors duration-200 ease-out hover:bg-sunken hover:text-fg",
        "disabled:pointer-events-none disabled:opacity-25",
      )}
    >
      {children}
    </button>
  );
}
