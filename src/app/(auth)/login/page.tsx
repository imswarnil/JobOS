import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in" };

// Reads DEMO_EMAIL at request time so the hint reflects the deployment.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-fg">
          Welcome back
        </h1>
        <p className="text-sm leading-relaxed text-fg-muted">
          Pick up where you left off.
        </p>
      </div>

      <AuthForm mode="login" demoEmail={process.env.DEMO_EMAIL} />

      <p className="text-center text-sm text-fg-muted">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-fg hover:text-fg-accent">
          Create an account
        </Link>
      </p>
    </div>
  );
}
