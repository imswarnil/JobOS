"use client";

import * as React from "react";
import { AlertCircle, Check, ChevronDown, Loader2, Plus, X } from "lucide-react";

import { createEntryAction, type EntryFormState } from "@/lib/journal/actions";
import { LOG_TYPES } from "@/lib/journal/types";
import type { LogType } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Field, Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
  companyId?: string | null;
}

/**
 * The composer.
 *
 * Type is picked first and visibly, because it changes what the entry is
 * *for* — and the placeholder in the body field changes with it. A prompt
 * specific enough to answer is most of the difference between an empty box
 * and a filled journal.
 *
 * Company is optional on every type. A thing you learned on a Sunday is still
 * career history.
 */
export function EntryComposer({
  companies,
  projects,
}: {
  companies: Option[];
  projects: Option[];
}) {
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<LogType>("work");
  const [companyId, setCompanyId] = React.useState("");
  const [showDetail, setShowDetail] = React.useState(false);

  const [state, formAction, pending] = React.useActionState<
    EntryFormState,
    FormData
  >(createEntryAction, {});

  /**
   * Collapse once the server confirms the insert. Adjusted during render
   * rather than in an effect so the composer is already closed in the commit
   * that paints the new entry — an effect would flash the filled form for a
   * frame first. Collapsing unmounts the form, so the fields reset
   * themselves; there is no ref to clear.
   */
  const [handledOk, setHandledOk] = React.useState(false);
  if (state.ok && !handledOk) {
    setHandledOk(true);
    setShowDetail(false);
    setOpen(false);
  } else if (!state.ok && handledOk) {
    setHandledOk(false);
  }

  const meta = LOG_TYPES.find((t) => t.id === type) ?? LOG_TYPES[0];
  const visibleProjects = companyId
    ? projects.filter((p) => p.companyId === companyId)
    : projects;
  const today = new Date().toISOString().slice(0, 10);

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
        What happened today? Work, a lesson, a wall, a trick — all of it counts.
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-card border border-line bg-surface shadow-e2"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-5 py-3.5">
        <p className="text-sm font-semibold text-fg">New entry</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close composer"
          className="grid h-7 w-7 place-items-center rounded-control text-fg-faint hover:bg-sunken hover:text-fg"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <div className="space-y-5 p-5">
        <input type="hidden" name="type" value={type} />

        <div className="space-y-2">
          <Label htmlFor="type-work">Kind of entry</Label>
          <div className="flex flex-wrap gap-1.5" role="radiogroup">
            {LOG_TYPES.map((t) => {
              const Icon = t.icon;
              const active = t.id === type;
              return (
                <button
                  key={t.id}
                  id={`type-${t.id}`}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  title={t.blurb}
                  onClick={() => setType(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-semibold",
                    "transition-colors duration-200 ease-out",
                    active
                      ? "border-line-accent bg-accent text-fg-on-accent"
                      : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  {t.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-fg-subtle">{meta.blurb}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Field label="Title" htmlFor="title">
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              placeholder="One line. What would you say if someone asked?"
            />
          </Field>
          <Field label="When" htmlFor="occurredOn">
            <Input
              id="occurredOn"
              name="occurredOn"
              type="date"
              required
              defaultValue={today}
              max={today}
            />
          </Field>
        </div>

        <Field label="What happened" htmlFor="body">
          <textarea
            id="body"
            name="body"
            required
            rows={5}
            placeholder={meta.prompt}
            className={cn(
              "w-full rounded-control border border-line bg-surface px-3 py-2.5",
              "text-sm leading-relaxed text-fg placeholder:text-fg-faint",
              "transition-colors duration-200 ease-out hover:border-line-strong",
            )}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" htmlFor="companyId" hint="Optional">
            <Select
              id="companyId"
              name="companyId"
              value={companyId}
              onChange={(v) => setCompanyId(v)}
              placeholder="Personal — not for an employer"
              options={companies}
            />
          </Field>
          <Field label="Project" htmlFor="projectId" hint="Optional">
            <Select
              id="projectId"
              name="projectId"
              placeholder="No project"
              options={visibleProjects}
            />
          </Field>
        </div>

        {showDetail ? (
          <div className="space-y-4 border-t border-line-subtle pt-5">
            <Field label="What fought back" htmlFor="challenges" hint="Optional">
              <textarea
                id="challenges"
                name="challenges"
                rows={3}
                placeholder="The part that was harder than it should have been."
                className="w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed text-fg placeholder:text-fg-faint hover:border-line-strong"
              />
            </Field>
            <Field
              label="Impact"
              htmlFor="impact"
              hint="This is what resumes are made of"
            >
              <textarea
                id="impact"
                name="impact"
                rows={3}
                placeholder="What changed because of it? Numbers if you have them."
                className="w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed text-fg placeholder:text-fg-faint hover:border-line-strong"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_8rem]">
              <Field label="Tech" htmlFor="techTags" hint="Comma separated">
                <Input id="techTags" name="techTags" placeholder="postgres, react" />
              </Field>
              <Field label="Tags" htmlFor="tags" hint="Comma separated">
                <Input id="tags" name="tags" placeholder="performance, incident" />
              </Field>
              <Field label="Minutes" htmlFor="minutesSpent" hint="Optional">
                <Input
                  id="minutesSpent"
                  name="minutesSpent"
                  type="number"
                  min={0}
                  max={1440}
                  placeholder="90"
                />
              </Field>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDetail(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-fg-subtle hover:text-fg"
          >
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} />
            Add impact, challenges and tags
          </button>
        )}

        {state.error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-control border border-danger-line/40 bg-danger-bg px-3 py-2.5 text-xs text-danger-fg"
          >
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            {state.error}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-line-subtle px-5 py-3.5">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
          ) : (
            <Check className="h-4 w-4" strokeWidth={2.5} />
          )}
          Save entry
        </Button>
      </div>
    </form>
  );
}

/** A native select, styled to match the Input. */
function Select({
  id,
  name,
  options,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  name: string;
  options: Option[];
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        defaultValue={onChange ? undefined : ""}
        className={cn(
          "h-10 w-full appearance-none rounded-control border border-line bg-surface pr-9 pl-3",
          "text-sm text-fg transition-colors duration-200 ease-out hover:border-line-strong",
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-fg-faint"
        strokeWidth={2}
      />
    </div>
  );
}
