import type { Metadata } from "next";
import { Suspense } from "react";
import { NotebookPen, SearchX } from "lucide-react";

import {
  countsByType,
  listCompanies,
  listEntries,
  listProjects,
} from "@/lib/journal/queries";
import { LOG_TYPES, logTypeMeta } from "@/lib/journal/types";
import type { LogType } from "@/lib/db/schema";
import { PageHeader } from "@/components/page-header";
import { EntryCard } from "@/components/journal/entry-card";
import { EntryComposer } from "@/components/journal/entry-composer";
import { JournalSearch } from "@/components/journal/journal-search";
import { TypeFilter } from "@/components/journal/type-filter";

export const metadata: Metadata = { title: "Journal" };
export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(LOG_TYPES.map((t) => t.id));

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const params = await searchParams;
  const type =
    params.type && VALID_TYPES.has(params.type as LogType)
      ? (params.type as LogType)
      : undefined;

  const [entries, counts, companies, projects] = await Promise.all([
    listEntries({ type, q: params.q }),
    countsByType(),
    listCompanies(),
    listProjects(),
  ]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Work journal"
        description="Everything that made you better at your job — what you shipped, what you learned, what went wrong, and the tricks worth keeping. A company is optional; plenty of this happens on a Sunday."
      />

      <EntryComposer companies={companies} projects={projects} />

      <Suspense fallback={<div className="h-24" />}>
        <div className="space-y-4">
          <JournalSearch />
          <TypeFilter counts={counts} total={total} />
        </div>
      </Suspense>

      {entries.length ? (
        <div className="space-y-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <EmptyState
          type={type}
          query={params.q?.trim() || undefined}
          hasAny={total > 0}
        />
      )}
    </div>
  );
}

function EmptyState({
  type,
  query,
  hasAny,
}: {
  type?: LogType;
  query?: string;
  hasAny: boolean;
}) {
  const meta = type ? logTypeMeta(type) : null;
  const filtered = Boolean(type) || Boolean(query);

  // Three different nothings, and they mean different things: no entries at
  // all, none of this kind, or none matching a search.
  let heading: string;
  let body: string;

  if (query) {
    heading = `Nothing matches “${query}”`;
    body = type
      ? `No ${meta?.label.toLowerCase()} entries mention that. Try clearing the filter, or searching for something else.`
      : "Search covers the title, the entry itself and the impact. Try a shorter phrase.";
  } else if (type) {
    heading = `No ${meta?.label.toLowerCase()} entries yet`;
    body = meta?.prompt ?? "";
  } else if (hasAny) {
    heading = "Nothing here";
    body = "Clear the filters to see your entries.";
  } else {
    heading = "Nothing logged yet";
    body =
      "The hardest part is the first entry. Write down one thing from today — it does not have to be impressive, it has to be true.";
  }

  return (
    <div className="relative overflow-hidden rounded-card border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="relative mx-auto max-w-sm space-y-2">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-control border border-line bg-surface text-fg-muted shadow-e1">
          {filtered ? (
            <SearchX className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <NotebookPen className="h-5 w-5" strokeWidth={1.75} />
          )}
        </span>
        <h3 className="text-base font-semibold text-fg">{heading}</h3>
        <p className="text-sm leading-relaxed text-fg-muted">{body}</p>
      </div>
    </div>
  );
}
