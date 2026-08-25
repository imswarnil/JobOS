"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Info, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The sign-in / sign-up form.
 *
 * Phase 0 renders the real thing but authenticates nobody: submitting shows a
 * brief pending state and then walks to the dashboard, which is open anyway.
 * The point is to settle the layout, the field set and the provider buttons
 * now, so that turning Neon Auth on later is a change of handler and not a
 * redesign.
 *
 * TODO(Phase 1): replace `handleSubmit` with the Neon Auth (Stack) client
 * calls — `signInWithCredential` / `signUpWithCredential` — and replace the
 * Google button with `signInWithOAuth('google')`.
 */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const isSignup = mode === "signup";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    // TODO(Phase 1): real credential call. The delay is only here so the
    // pending state is visible while the screen is a placeholder.
    setTimeout(() => router.push("/dashboard"), 450);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2.5 rounded-control border border-info-line/30 bg-info-bg px-3 py-2.5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info-fg" strokeWidth={2} />
        <p className="text-xs leading-relaxed text-info-fg">
          Authentication is not wired up yet — this screen is the Phase&nbsp;0
          shell. Any submission takes you straight to the app.
        </p>
      </div>

      <div className="grid gap-2.5">
        <ProviderButton
          label="Continue with Google"
          onClick={() => router.push("/dashboard")}
          icon={<GoogleMark />}
        />
        <ProviderButton
          label="Continue with GitHub"
          onClick={() => router.push("/dashboard")}
          icon={<GitHubMark />}
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="t-slate">or with email</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignup ? (
          <Field label="Name" htmlFor="name">
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Swarnil Singhai"
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
          hint={
            isSignup ? (
              "8 characters minimum"
            ) : (
              <button type="button" className="hover:text-fg-muted">
                Forgot?
              </button>
            )
          }
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

function ProviderButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 items-center justify-center gap-2.5 rounded-control border border-line bg-surface",
        "text-sm font-medium text-fg transition-colors duration-200 ease-out",
        "hover:border-line-strong hover:bg-sunken",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14Z"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg
      className="h-4 w-4 fill-current"
      viewBox="0 0 16 16"
      aria-hidden
      focusable="false"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
