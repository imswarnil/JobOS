"use client";

import * as React from "react";
import { CalendarDays, Pencil, Plus, Star, Trash2 } from "lucide-react";

import { deleteOrgAction, toggleCurrentAction } from "@/lib/career/actions";
import { ORG_KINDS, orgKindMeta } from "@/lib/career/types";
import type { Org } from "@/lib/career/queries";
import { OrgForm } from "@/components/career/org-form";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";

/**
 * The places work happened, grouped by kind.
 *
 * Empty groups still render their "add" affordance — the point of this screen
 * is to be filled in, and a group that vanishes when empty is a group nobody
 * discovers.
 */
export function OrgList({ orgs }: { orgs: Org[] }) {
  const [addingKind, setAddingKind] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  return (
    <div className="space-y-4">
      {ORG_KINDS.map((kind) => {
        const rows = orgs.filter((o) => o.kind === kind.id);
        const Icon = kind.icon;

        return (
          <section
            key={kind.id}
            className="rounded-card border border-line bg-surface shadow-e1"
          >
            <header className="flex flex-wrap items-center gap-2 border-b border-line-subtle px-4 py-3">
              <Icon className="h-4 w-4 shrink-0 text-fg-faint" strokeWidth={1.75} />
              <h3 className="text-sm font-semibold text-fg">{kind.plural}</h3>
              <span className="t-num text-xs text-fg-faint">{rows.length}</span>
              <p className="ml-auto hidden text-xs text-fg-subtle sm:block">
                {kind.hint}
              </p>
            </header>

            <div className="space-y-2 p-4">
              {rows.map((org) =>
                editingId === org.id ? (
                  <OrgForm
                    key={org.id}
                    org={org}
                    onDone={() => setEditingId(null)}
                  />
                ) : (
                  <Row
                    key={org.id}
                    org={org}
                    onEdit={() => setEditingId(org.id)}
                  />
                ),
              )}

              {addingKind === kind.id ? (
                <OrgForm
                  defaultKind={kind.id}
                  onDone={() => setAddingKind(null)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingKind(kind.id)}
                  className={cn(
                    "fx-press flex w-full items-center gap-2 rounded-control border border-dashed border-line-strong px-3 py-2.5",
                    "text-left text-[0.8125rem] text-fg-subtle transition-colors duration-200 ease-out",
                    "hover:border-line-accent hover:bg-sunken hover:text-fg",
                  )}
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                  Add {kind.label.toLowerCase()}
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Row({ org, onEdit }: { org: Org; onEdit: () => void }) {
  const meta = orgKindMeta(org.kind);
  const range = [
    org.startDate ? formatDate(org.startDate) : "",
    org.isCurrent ? "Present" : org.endDate ? formatDate(org.endDate) : "",
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-control border px-3 py-2.5",
        org.isCurrent
          ? "border-line-accent/40 bg-accent-soft/40"
          : "border-line-subtle",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[0.8125rem] font-semibold text-fg">
          {org.name}
          {org.isCurrent ? <Badge tone="accent">Current</Badge> : null}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
          {org.role ? <span>{org.role}</span> : null}
          {range ? (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" strokeWidth={1.75} />
              {range}
            </span>
          ) : null}
          {!org.role && !range ? <span>{meta.label}</span> : null}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <form action={toggleCurrentAction}>
          <input type="hidden" name="id" value={org.id} />
          <input type="hidden" name="next" value={org.isCurrent ? "0" : "1"} />
          <button
            type="submit"
            aria-label={
              org.isCurrent
                ? `Stop treating ${org.name} as current`
                : `Make ${org.name} current`
            }
            title={org.isCurrent ? "Currently here" : "Mark as current"}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-control transition-colors duration-200 ease-out",
              org.isCurrent
                ? "text-craft hover:bg-sunken"
                : "text-fg-faint hover:bg-sunken hover:text-fg",
            )}
          >
            <Star
              className="h-3.5 w-3.5"
              strokeWidth={1.75}
              fill={org.isCurrent ? "currentColor" : "none"}
            />
          </button>
        </form>

        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${org.name}`}
          className="grid h-7 w-7 place-items-center rounded-control text-fg-faint transition-colors duration-200 ease-out hover:bg-sunken hover:text-fg"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>

        <form action={deleteOrgAction}>
          <input type="hidden" name="id" value={org.id} />
          <button
            type="submit"
            aria-label={`Delete ${org.name}`}
            title="Entries are kept — they just become personal"
            className="grid h-7 w-7 place-items-center rounded-control text-fg-faint transition-colors duration-200 ease-out hover:bg-danger-bg hover:text-danger-fg"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </div>
  );
}
