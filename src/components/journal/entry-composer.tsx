"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  X,
} from "lucide-react";

import { createEntryAction, type EntryFormState } from "@/lib/journal/actions";
import { LOG_TYPES } from "@/lib/journal/types";
import type { LogType } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
  companyId?: string | null;
}

const textarea = cn(
  "w-full rounded-control border border-line bg-surface px-3 py-2.5",
  "text-sm leading-relaxed text-fg placeholder:text-fg-faint",
  "transition-colors duration-200 ease-out hover:border-line-strong",
);

/**
 * The composer.
 *
 * Optimised for the entry you would otherwise not write. One line and a type
 * is a complete log — the date defaults to today, the company defaults to
 * wherever you currently work, and everything else is behind a disclosure.
 * The long form is still there; it is just no longer the price of admission.
 *
 * ⌘/Ctrl+Enter saves from anywhere in the form, so a log can be typed and
 * filed without the mouse.
 */
export function EntryComposer({
  companies,
  projects,
  currentCompanyId,
}: {
  companies: Option[];
  projects: Option[];
  /** Whatever is starred in Career setup. The default for a new entry. */
  currentCompanyId?: string | null;
}) {
  const params = useSearchParams();
  // The sidebar's "Log today's work" links to ?compose=1 so it opens straight
  // into the composer rather than dropping you on the page to find it.
  const autoOpen = params.get("compose") === "1";

  const [open, setOpen] = React.useState(autoOpen);
  const [type, setType] = React.useState<LogType>("work");
  const [companyId, setCompanyId] = React.useState(currentCompanyId ?? "");
  const [showDetail, setShowDetail] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = React.useActionState<
    EntryFormState,
    FormData
  >(createEntryAction, {});

  // Collapse once the server confirms. Adjusted during render rather than in
  // an effect, so the list repaints already showing the saved entry.
  const [handledOk, setHandledOk] = React.useState(false);
  if (state.ok && !handledOk) {
    setHandledOk(true);
    setShowDetail(false);
    setOpen(false);
    setType("work");
    setCompanyId(currentCompanyId ?? "");
  } else if (!state.ok && handledOk) {
    setHandledOk(false);
  }

  const meta = LOG_TYPES.find((t) => t.id === type) ?? LOG_TYPES[0];
  const visibleProjects = companyId
    ? projects.filter((p) => p.companyId === companyId)
    : projects;
  const today = new Date().toISOString().slice(0, 10);
  const currentName = companies.find((c) => c.id === currentCompanyId)?.name;

  function onKeyDown(event: React.KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fx-press group flex w-full items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface px-5 py-4",
          "text-left text-sm text-fg-subtle transition-colors duration-200 ease-out",
          "hover:border-line-accent hover:bg-sunken hover:text-fg",
        )}
      >
        <Plus
          className="h-4 w-4 shrink-0 transition-transform duration-200 ease-out group-hover:rotate-90"
          strokeWidth={2.25}
        />
        What happened today? One line is enough.
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onKeyDown={onKeyDown}
      className="fx-rise rounded-card border border-line bg-surface shadow-e2"
    >
      <input type="hidden" name="type" value={type} />

      {/* ── The quick path: type, one line, save ───────────────────────── */}
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kind of entry">
          {LOG_TYPES.map((t) => {
            const Icon = t.icon;
            const active = t.id === type;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                title={t.blurb}
                onClick={() => setType(t.id)}
                className={cn(
                  "fx-press flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-semibold",
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

        <input
          name="title"
          required
          maxLength={200}
          autoFocus
          placeholder={meta.prompt}
          aria-label="What happened"
          className={cn(
            "w-full rounded-control border border-line bg-surface px-3 py-3",
            "text-[0.9375rem] text-fg placeholder:text-fg-faint",
            "transition-colors duration-200 ease-out hover:border-line-strong",
          )}
        />

        {/* Defaults, stated rather than hidden — you can see what will be
            saved without opening anything. */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
          <label className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="sr-only">Date</span>
            <input
              type="date"
              name="occurredOn"
              defaultValue={today}
              max={today}
              className="rounded-control border border-line bg-surface px-2 py-1 text-xs text-fg-muted hover:border-line-strong"
            />
          </label>

          {currentName && !showDetail ? (
            <span className="rounded-pill bg-sunken px-2 py-1 text-[0.6875rem] font-medium text-fg-muted">
              {currentName}
            </span>
          ) : null}

          {!showDetail ? (
            <button
              type="button"
              onClick={() => setShowDetail(true)}
              className="flex items-center gap-1 font-semibold text-fg-subtle hover:text-fg"
            >
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} />
              More
            </button>
          ) : null}

          <span className="ml-auto hidden sm:block">
            <kbd className="rounded-sm border border-line px-1.5 py-px font-sans text-[0.625rem] font-semibold">
              ⌘↵
            </kbd>{" "}
            to save
          </span>
        </div>
      </div>

      {/* ── Everything else ────────────────────────────────────────────── */}
      {showDetail ? (
        <div className="fx-rise space-y-4 border-t border-line-subtle p-4 sm:p-5">
          <Field label="Detail" htmlFor="body" hint="Optional">
            <textarea
              id="body"
              name="body"
              rows={4}
              placeholder="The version you would tell a colleague."
              className={textarea}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Where" htmlFor="companyId" hint="Optional">
              <Select
                id="companyId"
                name="companyId"
                value={companyId}
                onChange={setCompanyId}
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

          <Field label="What fought back" htmlFor="challenges" hint="Optional">
            <textarea
              id="challenges"
              name="challenges"
              rows={2}
              placeholder="The part that was harder than it should have been."
              className={textarea}
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
              rows={2}
              placeholder="What changed because of it? Numbers if you have them."
              className={textarea}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_7rem]">
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
        // Keep the default company in the payload even when the detail panel
        // has never been opened — otherwise a quick log silently loses it.
        <input type="hidden" name="companyId" value={companyId} />
      )}

      {state.error ? (
        <p
          role="alert"
          className="mx-4 mb-4 flex items-start gap-2 rounded-control border border-danger-line/40 bg-danger-bg px-3 py-2.5 text-xs text-danger-fg sm:mx-5"
        >
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-t border-line-subtle px-4 py-3 sm:px-5">
        <p className="text-xs text-fg-subtle">{meta.blurb}</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            aria-label="Close composer"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
            ) : (
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
            Save
          </Button>
        </div>
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
