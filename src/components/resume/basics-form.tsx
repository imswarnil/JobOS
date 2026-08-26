"use client";

import * as React from "react";
import { AlertCircle, Check, Loader2, Plus, X } from "lucide-react";

import { saveBasicsAction, type ResumeFormState } from "@/lib/resume/actions";
import type { ResumeBasics } from "@/lib/resume/schema";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The block at the top of the page: who you are and how to reach you.
 *
 * Links are edited as rows rather than one comma-separated field, because a
 * label and a URL are two different things and pretending otherwise produces
 * resumes that say "https://github.com/…" where they should say "GitHub".
 */
export function BasicsForm({ basics }: { basics: ResumeBasics }) {
  const [state, formAction, pending] = React.useActionState<
    ResumeFormState,
    FormData
  >(saveBasicsAction, {});

  const [links, setLinks] = React.useState(
    basics.links.length
      ? basics.links.map((l) => ({ ...l }))
      : [{ id: "new-0", label: "", url: "" }],
  );

  return (
    <Card>
      <form action={formAction}>
        <CardHeader>
          <CardTitle>Header</CardTitle>
          <CardDescription>
            Name, one line about you, and how to get in touch. Keep the headline
            to a role, not an objective — nobody reads objectives.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="r-name">
              <Input id="r-name" name="name" defaultValue={basics.name} maxLength={120} />
            </Field>
            <Field label="Headline" htmlFor="r-headline" hint="Optional">
              <Input
                id="r-headline"
                name="headline"
                defaultValue={basics.headline}
                maxLength={160}
                placeholder="Senior Backend Engineer"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Email" htmlFor="r-email">
              <Input id="r-email" name="email" defaultValue={basics.email} maxLength={160} />
            </Field>
            <Field label="Phone" htmlFor="r-phone" hint="Optional">
              <Input id="r-phone" name="phone" defaultValue={basics.phone} maxLength={60} />
            </Field>
            <Field label="Location" htmlFor="r-location" hint="Optional">
              <Input
                id="r-location"
                name="location"
                defaultValue={basics.location}
                maxLength={120}
                placeholder="Bengaluru, India"
              />
            </Field>
          </div>

          <Field label="Summary" htmlFor="r-summary" hint="Optional, 2–3 lines">
            <textarea
              id="r-summary"
              name="summary"
              rows={3}
              maxLength={800}
              defaultValue={basics.summary}
              placeholder="What you do, what you are good at, and the kind of problem you want next."
              className={cn(
                "w-full rounded-control border border-line bg-surface px-3 py-2.5",
                "text-sm leading-relaxed text-fg placeholder:text-fg-faint",
                "transition-colors duration-200 ease-out hover:border-line-strong",
              )}
            />
          </Field>

          <div className="space-y-2">
            <p className="text-sm font-medium text-fg">Links</p>
            {links.map((link, i) => (
              <div key={link.id} className="flex gap-2">
                <Input
                  name="linkLabel"
                  defaultValue={link.label}
                  placeholder="GitHub"
                  maxLength={60}
                  aria-label={`Link ${i + 1} label`}
                  className="w-36 shrink-0"
                />
                <Input
                  name="linkUrl"
                  defaultValue={link.url}
                  placeholder="https://github.com/you"
                  maxLength={300}
                  aria-label={`Link ${i + 1} URL`}
                />
                <button
                  type="button"
                  onClick={() => setLinks(links.filter((_, j) => j !== i))}
                  aria-label={`Remove link ${i + 1}`}
                  className="grid h-10 w-9 shrink-0 place-items-center rounded-control text-fg-faint hover:bg-sunken hover:text-fg"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            ))}
            {links.length < 6 ? (
              <button
                type="button"
                onClick={() =>
                  setLinks([
                    ...links,
                    { id: `new-${links.length}-${Date.now()}`, label: "", url: "" },
                  ])
                }
                className="flex items-center gap-1.5 text-xs font-semibold text-fg-subtle hover:text-fg"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                Add link
              </button>
            ) : null}
          </div>

          {state.error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-control border border-danger-line/40 bg-danger-bg px-3 py-2.5 text-xs text-danger-fg"
            >
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              {state.error}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="justify-between">
          <p className="text-xs text-fg-subtle" aria-live="polite">
            {state.ok ? (
              <span className="flex items-center gap-1.5 text-success-fg">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Saved.
              </span>
            ) : (
              "Appears at the top of the document."
            )}
          </p>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
            ) : null}
            Save header
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
