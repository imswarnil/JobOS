"use client";

import * as React from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";

import { saveOrgAction, type CareerFormState } from "@/lib/career/actions";
import { ORG_KINDS } from "@/lib/career/types";
import type { Org } from "@/lib/career/queries";
import type { OrgKind } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Add or edit a place work happened.
 *
 * `kind` first, because it changes the vocabulary of everything under it — a
 * course has no "role", and asking for one is how a form tells you it does not
 * understand what you are entering.
 */
export function OrgForm({
  org,
  defaultKind = "employer",
  onDone,
}: {
  org?: Org;
  defaultKind?: OrgKind;
  onDone: () => void;
}) {
  const [state, formAction, pending] = React.useActionState<
    CareerFormState,
    FormData
  >(saveOrgAction, {});

  const [kind, setKind] = React.useState<OrgKind>(org?.kind ?? defaultKind);
  const [current, setCurrent] = React.useState(org?.isCurrent ?? false);

  const [handled, setHandled] = React.useState(false);
  if (state.ok && !handled) {
    setHandled(true);
    onDone();
  } else if (!state.ok && handled) {
    setHandled(false);
  }

  const isEdu = kind === "education";
  const uid = org?.id ?? "new";

  return (
    <form
      action={formAction}
      className="fx-rise space-y-4 rounded-control border border-line bg-sunken/60 p-4"
    >
      {org ? <input type="hidden" name="id" value={org.id} /> : null}
      <input type="hidden" name="kind" value={kind} />

      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kind">
        {ORG_KINDS.map((k) => {
          const Icon = k.icon;
          const active = k.id === kind;
          return (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={k.hint}
              onClick={() => setKind(k.id)}
              className={cn(
                "fx-press flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-semibold",
                "transition-colors duration-200 ease-out",
                active
                  ? "border-line-accent bg-accent text-fg-on-accent"
                  : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg",
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              {k.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={isEdu ? "Course or school" : "Name"} htmlFor={`org-name-${uid}`}>
          <Input
            id={`org-name-${uid}`}
            name="name"
            required
            maxLength={160}
            defaultValue={org?.name}
            placeholder={isEdu ? "Frontend Masters" : "Northwind Logistics"}
          />
        </Field>
        {!isEdu ? (
          <Field label="Your role" htmlFor={`org-role-${uid}`} hint="Optional">
            <Input
              id={`org-role-${uid}`}
              name="role"
              maxLength={160}
              defaultValue={org?.role ?? ""}
              placeholder="Senior Backend Engineer"
            />
          </Field>
        ) : (
          <Field label="What it covers" htmlFor={`org-role-${uid}`} hint="Optional">
            <Input
              id={`org-role-${uid}`}
              name="role"
              maxLength={160}
              defaultValue={org?.role ?? ""}
              placeholder="React performance"
            />
          </Field>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <Field label="From" htmlFor={`org-start-${uid}`} hint="Optional">
          <Input
            id={`org-start-${uid}`}
            name="startDate"
            type="date"
            defaultValue={org?.startDate ?? ""}
          />
        </Field>
        <Field label="To" htmlFor={`org-end-${uid}`} hint="Optional">
          <Input
            id={`org-end-${uid}`}
            name="endDate"
            type="date"
            defaultValue={org?.endDate ?? ""}
            disabled={current}
          />
        </Field>
        <label className="flex items-end gap-2 pb-2.5 text-sm text-fg-muted">
          <input
            type="checkbox"
            name="isCurrent"
            defaultChecked={org?.isCurrent}
            onChange={(e) => setCurrent(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Current
        </label>
      </div>

      <p className="-mt-2 text-xs text-fg-subtle">
        Marking something current makes it the default when you log an entry.
      </p>

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
          {org ? "Save" : "Add"}
        </Button>
      </div>
    </form>
  );
}
