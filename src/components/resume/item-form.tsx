"use client";

import * as React from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";

import { saveItemAction, type ResumeFormState } from "@/lib/resume/actions";
import { KIND_META, type ResumeItem, type SectionKind } from "@/lib/resume/schema";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const textarea = cn(
  "w-full rounded-control border border-line bg-surface px-3 py-2.5",
  "text-sm leading-relaxed text-fg placeholder:text-fg-faint",
  "transition-colors duration-200 ease-out hover:border-line-strong",
);

/**
 * Add or edit one entry.
 *
 * The same form does both — `item` present means edit, absent means add — so
 * there is one definition of what an entry is, and the two paths cannot drift.
 *
 * Which fields appear depends on the section kind, because asking for a date
 * range on a skills group is how forms teach people the tool does not
 * understand them.
 */
export function ItemForm({
  sectionId,
  kind,
  item,
  onDone,
}: {
  sectionId: string;
  kind: SectionKind;
  item?: ResumeItem;
  onDone: () => void;
}) {
  const [state, formAction, pending] = React.useActionState<
    ResumeFormState,
    FormData
  >(saveItemAction, {});

  const [current, setCurrent] = React.useState(item?.current ?? false);

  // Collapse once the server confirms. Adjusted during render, not in an
  // effect, so the list repaints already showing the saved entry.
  const [handled, setHandled] = React.useState(false);
  if (state.ok && !handled) {
    setHandled(true);
    onDone();
  } else if (!state.ok && handled) {
    setHandled(false);
  }

  const isSkills = kind === "skills";
  const isProject = kind === "projects";
  const noun = KIND_META[kind].itemNoun;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-control border border-line bg-sunken/60 p-4"
    >
      <input type="hidden" name="sectionId" value={sectionId} />
      {item ? <input type="hidden" name="itemId" value={item.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={isSkills ? "Group" : "Title"}
          htmlFor={`title-${sectionId}-${item?.id ?? "new"}`}
        >
          <Input
            id={`title-${sectionId}-${item?.id ?? "new"}`}
            name="title"
            required
            maxLength={160}
            defaultValue={item?.title}
            placeholder={
              isSkills
                ? "Languages"
                : isProject
                  ? "JobOS"
                  : kind === "education"
                    ? "BSc Computer Science"
                    : "Senior Backend Engineer"
            }
          />
        </Field>

        {!isSkills ? (
          <Field
            label={kind === "education" ? "Institution" : "Organisation"}
            htmlFor={`subtitle-${sectionId}-${item?.id ?? "new"}`}
            hint="Optional"
          >
            <Input
              id={`subtitle-${sectionId}-${item?.id ?? "new"}`}
              name="subtitle"
              maxLength={160}
              defaultValue={item?.subtitle}
              placeholder={
                kind === "education" ? "University of Somewhere" : "Northwind Logistics"
              }
            />
          </Field>
        ) : (
          <Field
            label="Or a plain description"
            htmlFor={`subtitle-${sectionId}-${item?.id ?? "new"}`}
            hint="Used if you add no tags"
          >
            <Input
              id={`subtitle-${sectionId}-${item?.id ?? "new"}`}
              name="subtitle"
              maxLength={160}
              defaultValue={item?.subtitle}
            />
          </Field>
        )}
      </div>

      {!isSkills ? (
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <Field
            label="From"
            htmlFor={`start-${sectionId}-${item?.id ?? "new"}`}
            hint="Optional"
          >
            <Input
              id={`start-${sectionId}-${item?.id ?? "new"}`}
              name="startDate"
              maxLength={40}
              defaultValue={item?.startDate}
              placeholder="Mar 2024"
            />
          </Field>
          <Field
            label="To"
            htmlFor={`end-${sectionId}-${item?.id ?? "new"}`}
            hint="Optional"
          >
            <Input
              id={`end-${sectionId}-${item?.id ?? "new"}`}
              name="endDate"
              maxLength={40}
              defaultValue={item?.endDate}
              placeholder="Jan 2026"
              disabled={current}
            />
          </Field>
          <label className="flex items-end gap-2 pb-2.5 text-sm text-fg-muted">
            <input
              type="checkbox"
              name="current"
              defaultChecked={item?.current}
              onChange={(e) => setCurrent(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Current
          </label>
        </div>
      ) : null}

      {!isSkills ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Location"
            htmlFor={`loc-${sectionId}-${item?.id ?? "new"}`}
            hint="Optional"
          >
            <Input
              id={`loc-${sectionId}-${item?.id ?? "new"}`}
              name="location"
              maxLength={120}
              defaultValue={item?.location}
              placeholder="Remote"
            />
          </Field>
          <Field
            label="Link"
            htmlFor={`url-${sectionId}-${item?.id ?? "new"}`}
            hint="Optional"
          >
            <Input
              id={`url-${sectionId}-${item?.id ?? "new"}`}
              name="url"
              maxLength={300}
              defaultValue={item?.url}
              placeholder="https://…"
            />
          </Field>
        </div>
      ) : null}

      {isSkills ? (
        <Field
          label="Skills"
          htmlFor={`tags-${sectionId}-${item?.id ?? "new"}`}
          hint="Comma separated"
        >
          <Input
            id={`tags-${sectionId}-${item?.id ?? "new"}`}
            name="tags"
            defaultValue={item?.tags.join(", ")}
            placeholder="TypeScript, Go, SQL"
          />
        </Field>
      ) : (
        <>
          <Field
            label="Bullets"
            htmlFor={`bullets-${sectionId}-${item?.id ?? "new"}`}
            hint="One per line"
          >
            <textarea
              id={`bullets-${sectionId}-${item?.id ?? "new"}`}
              name="bullets"
              rows={5}
              defaultValue={item?.bullets.join("\n")}
              placeholder={
                "Cut the nightly billing run from 3 hours to 18 minutes\nLed the migration of 12M invoice rows with zero downtime"
              }
              className={textarea}
            />
          </Field>
          <p className="-mt-2 text-xs leading-relaxed text-fg-subtle">
            Start with the outcome, not the task. &ldquo;Cut the run to 18
            minutes&rdquo; beats &ldquo;responsible for the billing job&rdquo;.
          </p>
          <Field
            label="Tech"
            htmlFor={`itemtags-${sectionId}-${item?.id ?? "new"}`}
            hint="Comma separated, optional"
          >
            <Input
              id={`itemtags-${sectionId}-${item?.id ?? "new"}`}
              name="tags"
              defaultValue={item?.tags.join(", ")}
              placeholder="postgres, typescript"
            />
          </Field>
        </>
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

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
          ) : (
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          )}
          {item ? "Save" : `Add ${noun}`}
        </Button>
      </div>
    </form>
  );
}
