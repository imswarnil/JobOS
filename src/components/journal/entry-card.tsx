import { Building2, Clock, Trash2 } from "lucide-react";

import type { JournalEntry } from "@/lib/journal/queries";
import { logTypeMeta } from "@/lib/journal/types";
import { deleteEntryAction } from "@/lib/journal/actions";
import { formatDate } from "@/lib/utils";
import { LogTypeBadge } from "@/components/journal/log-type-badge";

/**
 * One entry on the timeline.
 *
 * `challenges` and `impact` only render when present — a "trick" entry has
 * neither, and an empty labelled section reads as missing data rather than as
 * a different kind of entry.
 */
export function EntryCard({ entry }: { entry: JournalEntry }) {
  const meta = logTypeMeta(entry.type);
  const Icon = meta.icon;
  const allTags = [...entry.techTags, ...entry.tags];

  return (
    <article className="relative rounded-card border border-line bg-surface p-5 shadow-e1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <LogTypeBadge type={entry.type} />
        <time
          dateTime={entry.occurredOn}
          className="t-num text-xs font-medium text-fg-subtle"
        >
          {formatDate(entry.occurredOn)}
        </time>

        {entry.companyName ? (
          <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <Building2 className="h-3 w-3" strokeWidth={1.75} />
            {entry.companyName}
            {entry.projectName ? (
              <span className="text-fg-faint">· {entry.projectName}</span>
            ) : null}
          </span>
        ) : (
          // Personal entries are the point of having log types at all —
          // label them rather than leaving a gap where a company would be.
          <span className="flex items-center gap-1.5 text-xs text-fg-faint">
            <Icon className="h-3 w-3" strokeWidth={1.75} />
            Personal
          </span>
        )}

        {entry.minutesSpent ? (
          <span className="t-num flex items-center gap-1.5 text-xs text-fg-faint">
            <Clock className="h-3 w-3" strokeWidth={1.75} />
            {formatMinutes(entry.minutesSpent)}
          </span>
        ) : null}

        <form action={deleteEntryAction} className="ml-auto">
          <input type="hidden" name="id" value={entry.id} />
          <button
            type="submit"
            aria-label={`Delete entry: ${entry.title}`}
            className="grid h-7 w-7 place-items-center rounded-control text-fg-faint transition-colors duration-200 ease-out hover:bg-danger-bg hover:text-danger-fg"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </form>
      </div>

      <h3 className="mt-3 text-[0.9375rem] leading-snug font-semibold text-fg">
        {entry.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-fg-muted">
        {entry.body}
      </p>

      {entry.challenges ? (
        <Section label="What fought back">{entry.challenges}</Section>
      ) : null}
      {entry.impact ? <Section label="Impact">{entry.impact}</Section> : null}

      {allTags.length ? (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <li
              key={tag}
              className="rounded-pill bg-sunken px-2 py-0.5 text-[0.6875rem] font-medium text-fg-subtle"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 border-l-2 border-line pl-3.5">
      <p className="t-slate">{label}</p>
      <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-fg-muted">
        {children}
      </p>
    </div>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
