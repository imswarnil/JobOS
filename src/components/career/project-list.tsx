"use client";

import * as React from "react";
import { AlertCircle, Check, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import {
  deleteProjectAction,
  saveProjectAction,
  type CareerFormState,
} from "@/lib/career/actions";
import type { Org, Proj } from "@/lib/career/queries";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Projects, optionally attached to an organisation.
 *
 * Kept separate from the org list rather than nested inside it: a project can
 * outlive the employer it started at, and nesting would imply it cannot.
 */
export function ProjectList({ projects, orgs }: { projects: Proj[]; orgs: Org[] }) {
  const [adding, setAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const orgName = (id: string | null) =>
    id ? (orgs.find((o) => o.id === id)?.name ?? null) : null;

  return (
    <section className="rounded-card border border-line bg-surface shadow-e1">
      <header className="flex flex-wrap items-center gap-2 border-b border-line-subtle px-4 py-3">
        <h3 className="text-sm font-semibold text-fg">Projects</h3>
        <span className="t-num text-xs text-fg-faint">{projects.length}</span>
        <p className="ml-auto hidden text-xs text-fg-subtle sm:block">
          The things you worked on, inside a job or outside one.
        </p>
      </header>

      <div className="space-y-2 p-4">
        {projects.map((p) =>
          editingId === p.id ? (
            <ProjectForm
              key={p.id}
              project={p}
              orgs={orgs}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <div
              key={p.id}
              className="flex items-start gap-3 rounded-control border border-line-subtle px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] font-semibold text-fg">{p.name}</p>
                <p className="mt-0.5 truncate text-xs text-fg-subtle">
                  {orgName(p.companyId) ?? "Personal"}
                  {p.description ? ` · ${p.description}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setEditingId(p.id)}
                  aria-label={`Edit ${p.name}`}
                  className="grid h-7 w-7 place-items-center rounded-control text-fg-faint hover:bg-sunken hover:text-fg"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
                <form action={deleteProjectAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    aria-label={`Delete ${p.name}`}
                    className="grid h-7 w-7 place-items-center rounded-control text-fg-faint hover:bg-danger-bg hover:text-danger-fg"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </form>
              </div>
            </div>
          ),
        )}

        {adding ? (
          <ProjectForm orgs={orgs} onDone={() => setAdding(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={cn(
              "fx-press flex w-full items-center gap-2 rounded-control border border-dashed border-line-strong px-3 py-2.5",
              "text-left text-[0.8125rem] text-fg-subtle transition-colors duration-200 ease-out",
              "hover:border-line-accent hover:bg-sunken hover:text-fg",
            )}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
            Add project
          </button>
        )}
      </div>
    </section>
  );
}

function ProjectForm({
  project,
  orgs,
  onDone,
}: {
  project?: Proj;
  orgs: Org[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = React.useActionState<
    CareerFormState,
    FormData
  >(saveProjectAction, {});

  const [handled, setHandled] = React.useState(false);
  if (state.ok && !handled) {
    setHandled(true);
    onDone();
  } else if (!state.ok && handled) {
    setHandled(false);
  }

  const uid = project?.id ?? "new";

  return (
    <form
      action={formAction}
      className="fx-rise space-y-4 rounded-control border border-line bg-sunken/60 p-4"
    >
      {project ? <input type="hidden" name="id" value={project.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={`p-name-${uid}`}>
          <Input
            id={`p-name-${uid}`}
            name="name"
            required
            maxLength={160}
            defaultValue={project?.name}
            placeholder="Fleet Console"
          />
        </Field>
        <Field label="Where" htmlFor={`p-org-${uid}`} hint="Optional">
          <select
            id={`p-org-${uid}`}
            name="companyId"
            defaultValue={project?.companyId ?? ""}
            className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg hover:border-line-strong"
          >
            <option value="">Personal — not for an employer</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Description" htmlFor={`p-desc-${uid}`} hint="Optional">
        <Input
          id={`p-desc-${uid}`}
          name="description"
          maxLength={2000}
          defaultValue={project?.description ?? ""}
          placeholder="Internal dispatcher tooling"
        />
      </Field>

      {state.error ? (
        <p role="alert" className="flex items-start gap-2 text-xs text-danger-fg">
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
          {project ? "Save" : "Add"}
        </Button>
      </div>
    </form>
  );
}
