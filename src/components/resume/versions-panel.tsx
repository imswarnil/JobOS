"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  Download,
  Eye,
  History,
  Loader2,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";

import {
  deleteVersionAction,
  restoreVersionAction,
  saveVersionAction,
  type ResumeFormState,
} from "@/lib/resume/actions";
import type { ResumeVersionRow } from "@/lib/resume/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";

/**
 * Named snapshots of the resume.
 *
 * A version is a copy, not a reference — editing the master afterwards must
 * not silently rewrite the document a company already has. "Which resume did
 * they actually get" is the question this exists to answer, and it is
 * unanswerable if versions are live views.
 */
export function VersionsPanel({
  versions,
  viewingId,
}: {
  versions: ResumeVersionRow[];
  /** Set when the preview is showing a version rather than the master. */
  viewingId?: string;
}) {
  const [state, formAction, pending] = React.useActionState<
    ResumeFormState,
    FormData
  >(saveVersionAction, {});

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-fg-faint" strokeWidth={1.75} />
          <CardTitle>Versions</CardTitle>
        </div>
        <CardDescription>
          Snapshot the resume before you tailor it for a role. A version is a
          copy — editing the master afterwards will not change it.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/*
          Keyed on the number of saved versions: a successful save revalidates
          the list, the count changes, the form remounts and the field clears.
          Declarative, and it avoids poking at a ref during render.
        */}
        <form key={versions.length} action={formAction} className="flex gap-2">
          <Input
            name="label"
            required
            maxLength={120}
            placeholder="e.g. Backend roles, Jan 2026"
            aria-label="Version name"
          />
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
            ) : (
              <Save className="h-4 w-4" strokeWidth={1.75} />
            )}
            Save
          </Button>
        </form>

        {state.error ? (
          <p role="alert" className="text-xs text-danger-fg">
            {state.error}
          </p>
        ) : null}
        {state.ok ? (
          <p className="flex items-center gap-1.5 text-xs text-success-fg">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            Snapshot saved.
          </p>
        ) : null}

        {versions.length === 0 ? (
          <p className="rounded-control border border-dashed border-line-strong px-3 py-5 text-center text-xs text-fg-subtle">
            No snapshots yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {versions.map((v) => (
              <li
                key={v.id}
                className={cn(
                  "flex items-center gap-2 rounded-control border px-3 py-2",
                  viewingId === v.id
                    ? "border-line-accent bg-accent-soft/40"
                    : "border-line-subtle",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8125rem] font-medium text-fg">
                    {v.label}
                  </p>
                  <p className="t-num text-xs text-fg-subtle">
                    {formatDate(v.createdAt)}
                  </p>
                </div>

                <Link
                  href={
                    viewingId === v.id ? "/resume" : `/resume?version=${v.id}`
                  }
                  scroll={false}
                  aria-label={
                    viewingId === v.id
                      ? "Back to the master resume"
                      : `Preview ${v.label}`
                  }
                  title={viewingId === v.id ? "Back to master" : "Preview"}
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-control transition-colors duration-200 ease-out",
                    viewingId === v.id
                      ? "text-accent-soft-fg"
                      : "text-fg-faint hover:bg-sunken hover:text-fg",
                  )}
                >
                  <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                </Link>

                <a
                  href={`/print/resume?version=${v.id}&auto=1`}
                  target="_blank"
                  rel="noopener"
                  aria-label={`Download ${v.label} as PDF`}
                  title="Open to print or save as PDF"
                  className="grid h-7 w-7 place-items-center rounded-control text-fg-faint transition-colors duration-200 ease-out hover:bg-sunken hover:text-fg"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                </a>

                <RestoreButton id={v.id} label={v.label} />

                <form action={deleteVersionAction}>
                  <input type="hidden" name="id" value={v.id} />
                  <button
                    type="submit"
                    aria-label={`Delete ${v.label}`}
                    className="grid h-7 w-7 place-items-center rounded-control text-fg-faint transition-colors duration-200 ease-out hover:bg-danger-bg hover:text-danger-fg"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Restoring snapshots the current master first, under an automatic name — so
 * restoring is never the move that loses work.
 */
function RestoreButton({ id, label }: { id: string; label: string }) {
  const [, formAction, pending] = React.useActionState<
    ResumeFormState,
    FormData
  >(restoreVersionAction, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Restore ${label} over the master resume`}
        title="Restore over the master (the current one is snapshotted first)"
        className="grid h-7 w-7 place-items-center rounded-control text-fg-faint transition-colors duration-200 ease-out hover:bg-sunken hover:text-fg disabled:opacity-40"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
        ) : (
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
        )}
      </button>
    </form>
  );
}
