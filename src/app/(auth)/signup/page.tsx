import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { isAuthConfigured } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Create account" };

// Reads DEMO_EMAIL at request time so the hint reflects the deployment.
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-fg">
          Start your record
        </h1>
        <p className="text-sm leading-relaxed text-fg-muted">
          One log a day is enough to never write a resume from scratch again.
        </p>
      </div>

      <AuthForm
        mode="signup"
        demoEmail={process.env.DEMO_EMAIL}
        configured={isAuthConfigured()}
      />

      <p className="text-center text-sm text-fg-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-fg hover:text-fg-accent">
          Sign in
        </Link>
      </p>
    </div>
  );
}
