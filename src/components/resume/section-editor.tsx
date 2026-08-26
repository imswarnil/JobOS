"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";

import {
  deleteItemAction,
  deleteSectionAction,
  moveItemAction,
  moveSectionAction,
  renameSectionAction,
  type ResumeFormState,
} from "@/lib/resume/actions";
import {
  KIND_META,
  formatRange,
  type ResumeSection,
} from "@/lib/resume/schema";
import { ItemForm } from "@/components/resume/item-form";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * One section and its entries.
 *
 * Order is meaning on a resume — whatever is at the top is what gets read — so
 * both sections and entries can be nudged up and down. Drag-and-drop would be
 * nicer and is a much larger surface to get right; two buttons are honest and
 * work on a phone.
 */
export function SectionEditor({
  section,
  isFirst,
  isLast,
}: {
  section: ResumeSection;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [adding, setAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [renaming, setRenaming] = React.useState(false);

  const meta = KIND_META[section.kind];

  return (
    <section className="rounded-card border border-line bg-surface shadow-e1">
      <header className="flex flex-wrap items-center gap-2 border-b border-line-subtle px-4 py-3">
        {renaming ? (
          <RenameForm section={section} onDone={() => setRenaming(false)} />
        ) : (
          <>
            <h3 className="text-sm font-semibold text-fg">{section.title}</h3>
            <Badge>{meta.label}</Badge>
            <span className="t-num text-xs text-fg-faint">
              {section.items.length}
            </span>

            <div className="ml-auto flex items-center gap-0.5">
              <IconButton
                label="Rename section"
                onClick={() => setRenaming(true)}
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
              </IconButton>

              <MoveButton
                action={moveSectionAction}
                fields={{ sectionId: section.id, direction: "up" }}
                label="Move section up"
                disabled={isFirst}
              >
                <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
              </MoveButton>
              <MoveButton
                action={moveSectionAction}
                fields={{ sectionId: section.id, direction: "down" }}
                label="Move section down"
                disabled={isLast}
              >
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
              </MoveButton>

              <form action={deleteSectionAction}>
                <input type="hidden" name="sectionId" value={section.id} />
                <IconButton label={`Delete ${section.title}`} danger submit>
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </IconButton>
              </form>
            </div>
          </>
        )}
      </header>

      <div className="space-y-2 p-4">
        {section.items.length === 0 && !adding ? (
          <p className="py-2 text-sm text-fg-subtle">{meta.hint}</p>
        ) : null}

        {section.items.map((item, i) =>
          editingId === item.id ? (
            <ItemForm
              key={item.id}
              sectionId={section.id}
              kind={section.kind}
              item={item}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-control border border-line-subtle px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] font-semibold text-fg">
                  {item.title}
                  {item.subtitle ? (
                    <span className="font-normal text-fg-muted">
                      {" "}
                      — {item.subtitle}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-fg-subtle">
                  {[
                    formatRange(item),
                    item.location,
                    section.kind === "skills"
                      ? item.tags.join(", ")
                      : item.bullets.length
                        ? `${item.bullets.length} bullet${item.bullets.length === 1 ? "" : "s"}`
                        : "No bullets yet",
                  ]
                    .filter(Boolean)
                    .join("  ·  ")}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <IconButton
                  label={`Edit ${item.title}`}
                  onClick={() => setEditingId(item.id)}
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                </IconButton>
                <MoveButton
                  action={moveItemAction}
                  fields={{
                    sectionId: section.id,
                    itemId: item.id,
                    direction: "up",
                  }}
                  label="Move up"
                  disabled={i === 0}
                >
                  <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
                </MoveButton>
                <MoveButton
                  action={moveItemAction}
                  fields={{
                    sectionId: section.id,
                    itemId: item.id,
                    direction: "down",
                  }}
                  label="Move down"
                  disabled={i === section.items.length - 1}
                >
                  <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
                </MoveButton>
                <form action={deleteItemAction}>
                  <input type="hidden" name="sectionId" value={section.id} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <IconButton label={`Delete ${item.title}`} danger submit>
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </IconButton>
                </form>
              </div>
            </div>
          ),
        )}

        {adding ? (
          <ItemForm
            sectionId={section.id}
            kind={section.kind}
            onDone={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={cn(
              "flex w-full items-center gap-2 rounded-control border border-dashed border-line-strong px-3 py-2.5",
              "text-left text-[0.8125rem] text-fg-subtle transition-colors duration-200 ease-out",
              "hover:border-line-accent hover:bg-sunken hover:text-fg",
            )}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
            Add {meta.itemNoun}
          </button>
        )}
      </div>
    </section>
  );
}

function RenameForm({
  section,
  onDone,
}: {
  section: ResumeSection;
  onDone: () => void;
}) {
  const [state, formAction] = React.useActionState<ResumeFormState, FormData>(
    renameSectionAction,
    {},
  );

  const [handled, setHandled] = React.useState(false);
  if (state.ok && !handled) {
    setHandled(true);
    onDone();
  }

  return (
    <form action={formAction} className="flex w-full items-center gap-2">
      <input type="hidden" name="sectionId" value={section.id} />
      <input
        name="title"
        defaultValue={section.title}
        autoFocus
        maxLength={80}
        aria-label="Section heading"
        className="h-8 flex-1 rounded-control border border-line bg-surface px-2.5 text-sm text-fg"
      />
      <button
        type="submit"
        className="h-8 rounded-control bg-accent px-3 text-xs font-semibold text-fg-on-accent"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onDone}
        className="h-8 rounded-control px-2 text-xs font-semibold text-fg-muted hover:text-fg"
      >
        Cancel
      </button>
    </form>
  );
}

/** A form-submitting reorder button. Disabled at the ends of the list. */
function MoveButton({
  action,
  fields,
  label,
  disabled,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center text-fg-faint opacity-30"
      >
        {children}
      </span>
    );
  }
  return (
    <form action={action}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <IconButton label={label} submit>
        {children}
      </IconButton>
    </form>
  );
}

function IconButton({
  label,
  onClick,
  submit,
  danger,
  children,
}: {
  label: string;
  onClick?: () => void;
  submit?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type={submit ? "submit" : "button"}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-control transition-colors duration-200 ease-out",
        danger
          ? "text-fg-faint hover:bg-danger-bg hover:text-danger-fg"
          : "text-fg-faint hover:bg-sunken hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
