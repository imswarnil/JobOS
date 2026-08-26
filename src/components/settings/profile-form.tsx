"use client";

import * as React from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";

import { updateProfileAction } from "@/lib/auth/actions";
import type { CurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Avatar } from "@/components/shell/user-menu";

/**
 * Name is editable; email is not.
 *
 * Changing the email on a credential account means re-verifying it, and Neon
 * Auth wants to drive that flow itself — so rendering it as an editable field
 * would be a promise this form cannot keep.
 */
export function ProfileForm({ user }: { user: CurrentUser }) {
  const [state, formAction, pending] = React.useActionState<
    { error?: string; ok?: boolean },
    FormData
  >(updateProfileAction, {});

  return (
    <form action={formAction}>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar user={user} className="h-14 w-14 rounded-card text-sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
            <p className="truncate text-xs text-fg-subtle">{user.email}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="settings-name">
            <Input
              id="settings-name"
              name="name"
              defaultValue={user.name}
              required
              maxLength={120}
            />
          </Field>
          <Field label="Email" htmlFor="settings-email" hint="Not editable yet">
            <Input id="settings-email" defaultValue={user.email} disabled />
          </Field>
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
            "Shown on your resume and in the sidebar."
          )}
        </p>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
          ) : null}
          Save changes
        </Button>
      </CardFooter>
    </form>
  );
}
