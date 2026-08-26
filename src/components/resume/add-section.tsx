"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";

import { addSectionAction, type ResumeFormState } from "@/lib/resume/actions";
import { KIND_META, SECTION_KINDS, type SectionKind } from "@/lib/resume/schema";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Add a section.
 *
 * The kind is a presentation choice, not a category the app polices — you
 * pick how entries should render, then name the heading whatever you like.
 * That is what makes "Speaking" or "Certifications" possible without new code.
 */
export function AddSection() {
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<SectionKind>("experience");

  const [state, formAction, pending] = React.useActionState<
    ResumeFormState,
    FormData
  >(addSectionAction, {});

  const [handled, setHandled] = React.useState(false);
  if (state.ok && !handled) {
    setHandled(true);
    setOpen(false);
  } else if (!state.ok && handled) {
    setHandled(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface px-5 py-4",
          "text-left text-sm text-fg-subtle transition-colors duration-200 ease-out",
          "hover:border-line-accent hover:bg-sunken hover:text-fg",
        )}
      >
        <Plus className="h-4 w-4 shrink-0" strokeWidth={2.25} />
        Add a section — experience, education, skills, or anything you name
        yourself
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-card border border-line bg-surface p-5 shadow-e1"
    >
      <input type="hidden" name="kind" value={kind} />

      <div className="space-y-2">
        <p className="text-sm font-medium text-fg">How should entries render?</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup">
          {SECTION_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={k === kind}
              title={KIND_META[k].hint}
              onClick={() => setKind(k)}
              className={cn(
                "rounded-pill border px-3 py-1.5 text-xs font-semibold",
                "transition-colors duration-200 ease-out",
                k === kind
                  ? "border-line-accent bg-accent text-fg-on-accent"
                  : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg",
              )}
            >
              {KIND_META[k].label}
            </button>
          ))}
        </div>
        <p className="text-xs text-fg-subtle">{KIND_META[kind].hint}</p>
      </div>

      <Field
        label="Heading"
        htmlFor="section-title"
        hint="Standard headings parse best"
      >
        <Input
          id="section-title"
          name="title"
          maxLength={80}
          defaultValue={KIND_META[kind].defaultTitle}
          key={kind}
          placeholder={KIND_META[kind].defaultTitle}
        />
      </Field>

      {state.error ? (
        <p role="alert" className="text-xs text-danger-fg">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
          ) : (
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          )}
          Add section
        </Button>
      </div>
    </form>
  );
}
