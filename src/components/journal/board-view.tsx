import { Building2, Clock } from "lucide-react";

import type { JournalEntry } from "@/lib/journal/queries";
import { LOG_TYPES } from "@/lib/journal/types";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";

/**
 * A column per kind.
 *
 * Read-only on purpose: the obvious kanban gesture is dragging a card between
 * columns, but "this was a setback, actually it was a win" is a re-reading of
 * what happened, not a status change — and drag-to-reclassify would make the
 * journal feel like a task board, which is the one thing it must not become.
 * Reclassifying is an edit, and it belongs in the entry.
 *
 * TODO(Phase 4): the pipeline board over `application` is where drag actually
 * fits, because there the columns really are states.
 */
export function BoardView({ entries }: { entries: JournalEntry[] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
      <div className="flex min-w-max gap-3">
        {LOG_TYPES.map((type) => {
          const column = entries.filter((e) => e.type === type.id);
          const Icon = type.icon;

          return (
            <section
              key={type.id}
              className="flex w-[17rem] shrink-0 flex-col rounded-card border border-line bg-sunken/60"
              aria-label={`${type.label} — ${column.length}`}
            >
              <header className="flex items-center gap-2 border-b border-line-subtle px-3 py-2.5">
                <Icon className="h-3.5 w-3.5 shrink-0 text-fg-muted" strokeWidth={2} />
                <h3 className="flex-1 truncate text-[0.8125rem] font-semibold text-fg">
                  {type.label}
                </h3>
                <span className="t-num text-xs text-fg-faint">
                  {column.length}
                </span>
              </header>

              <div className="fx-stagger flex-1 space-y-2 p-2">
                {column.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs leading-relaxed text-fg-faint">
                    {type.prompt}
                  </p>
                ) : (
                  column.map((entry, i) => (
                    <article
                      key={entry.id}
                      style={{ "--i": i } as React.CSSProperties}
                      className={cn(
                        "fx-lift rounded-control border border-line bg-surface p-3 shadow-e1",
                      )}
                    >
                      <p className="text-[0.8125rem] leading-snug font-semibold text-fg">
                        {entry.title}
                      </p>

                      {entry.body ? (
                        <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-fg-muted">
                          {entry.body}
                        </p>
                      ) : null}

                      <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.6875rem] text-fg-subtle">
                        <time dateTime={entry.occurredOn} className="t-num">
                          {formatDate(entry.occurredOn)}
                        </time>
                        {entry.companyName ? (
                          <span className="flex items-center gap-1 truncate">
                            <Building2 className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                            {entry.companyName}
                          </span>
                        ) : null}
                        {entry.minutesSpent ? (
                          <span className="t-num flex items-center gap-1">
                            <Clock className="h-3 w-3" strokeWidth={1.75} />
                            {entry.minutesSpent}m
                          </span>
                        ) : null}
                      </div>

                      {entry.techTags.length ? (
                        <ul className="mt-2 flex flex-wrap gap-1">
                          {entry.techTags.slice(0, 3).map((tag) => (
                            <li
                              key={tag}
                              className="rounded-pill bg-sunken px-1.5 py-0.5 text-[0.625rem] font-medium text-fg-subtle"
                            >
                              {tag}
                            </li>
                          ))}
                          {entry.techTags.length > 3 ? (
                            <li className="t-num px-1 py-0.5 text-[0.625rem] text-fg-faint">
                              +{entry.techTags.length - 3}
                            </li>
                          ) : null}
                        </ul>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Shown above the board so the read-only choice is explained, not just felt. */
export function BoardNote() {
  return (
    <p className="text-xs text-fg-subtle">
      Grouped by kind.{" "}
      <Badge tone="neutral">Read-only</Badge>{" "}
      Reclassifying an entry is an edit, not a drag — a journal is a record, not
      a task board.
    </p>
  );
}
