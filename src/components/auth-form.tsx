"use client";

import * as React from "react";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";

import {
  signInAction,
  signInAsDemoAction,
  signUpAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Sign-in / sign-up.
 *
 * Every credential path is a server action, so the password is posted and
 * discarded — it never lands in client state, and the auth cookie secret
 * never reaches the bundle. On success the action redirects, which is why
 * there is no success branch to render here.
 */
export function AuthForm({
  mode,
  demoEmail,
}: {
  mode: "login" | "signup";
  /** Present only when a demo account is configured on this deployment. */
  demoEmail?: string;
}) {
  const isSignup = mode === "signup";
  const action = isSignup ? signUpAction : signInAction;

  const [state, formAction, pending] = React.useActionState<
    AuthActionState,
    FormData
  >(action, {});

  return (
    <div className="space-y-6">
      <DemoButton email={demoEmail} />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="t-slate">or use an account</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form action={formAction} className="space-y-4">
        {state.error ? (
          <p
            role="alert"
            className="flex items-start gap-2.5 rounded-control border border-danger-line/40 bg-danger-bg px-3 py-2.5 text-xs leading-relaxed text-danger-fg"
          >
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            {state.error}
          </p>
        ) : null}

        {isSignup ? (
          <Field label="Name" htmlFor="name">
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Your name"
              required
            />
          </Field>
        ) : null}

        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          hint={isSignup ? "8 characters minimum" : undefined}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="••••••••"
            required
            minLength={8}
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={pending}
          className="w-full justify-center"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
          ) : null}
          {isSignup ? "Create account" : "Sign in"}
        </Button>
      </form>

      {isSignup ? (
        <p className="text-center text-xs leading-relaxed text-fg-faint">
          By creating an account you agree to keep an honest record of your own
          work.
        </p>
      ) : null}
    </div>
  );
}

/**
 * One click into a populated account. A tour that starts with an empty
 * journal shows nothing, so the demo user ships with fifteen real-looking
 * entries across all six log types.
 */
function DemoButton({ email }: { email?: string }) {
  const [state, formAction, pending] = React.useActionState<
    AuthActionState,
    FormData
  >(async () => signInAsDemoAction(), {});

  if (!email) return null;

  return (
    <form action={formAction} className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "flex h-12 w-full items-center justify-center gap-2.5 rounded-control",
          "border border-line-accent/40 bg-accent-soft text-sm font-semibold text-accent-soft-fg",
          "transition-colors duration-200 ease-out hover:bg-accent-soft/70",
          "disabled:pointer-events-none disabled:opacity-60",
        )}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
        ) : (
          <Sparkles className="h-4 w-4" strokeWidth={2} />
        )}
        Explore the demo account
      </button>
      <p className="text-center text-xs text-fg-subtle">
        No sign-up. A real account with a journal already in it —{" "}
        <span className="font-medium text-fg-muted">{email}</span>.
      </p>
      {state.error ? (
        <p role="alert" className="text-center text-xs text-danger-fg">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
