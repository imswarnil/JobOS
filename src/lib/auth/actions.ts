"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth/server";

/**
 * The only way a client component is allowed to touch authentication.
 *
 * Everything runs on the server, so the cookie secret and the auth base URL
 * never reach the browser bundle, and the password never sits in client state
 * any longer than the keystroke that produced it.
 */

export interface AuthActionState {
  error?: string;
}

const credentials = z.object({
  email: z.email("That does not look like an email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const signUpFields = credentials.extend({
  name: z.string().trim().min(1, "Please enter your name."),
});

/**
 * Neon Auth's error messages are accurate but written for developers. These
 * are the same facts in the voice of the product — and deliberately vague
 * about *which* half of the pair was wrong, so the form cannot be used to
 * enumerate accounts.
 */
function readableError(message: string | undefined): string {
  if (!message) return "Something went wrong. Try again.";
  const m = message.toLowerCase();
  if (m.includes("invalid") || m.includes("credential") || m.includes("password")) {
    return "That email and password do not match an account.";
  }
  if (m.includes("exists") || m.includes("already")) {
    return "An account with that email already exists. Try signing in.";
  }
  if (m.includes("not found")) {
    return "That email and password do not match an account.";
  }
  return message;
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await auth.signIn.email(parsed.data);
  if (error) return { error: readableError(error.message) };

  // Outside the try/catch-free path above because redirect() throws by design.
  redirect("/dashboard");
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpFields.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await auth.signUp.email(parsed.data);
  if (error) return { error: readableError(error.message) };

  redirect("/dashboard");
}

/** Signs in with the seeded demo account, so the tour is one click. */
export async function signInAsDemoAction(): Promise<AuthActionState> {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;

  if (!email || !password) {
    return {
      error:
        "No demo account is configured on this deployment. Set DEMO_EMAIL and DEMO_PASSWORD, then run `pnpm db:seed`.",
    };
  }

  const { error } = await auth.signIn.email({ email, password });
  if (error) {
    return {
      error:
        "The demo account is not set up yet. Run `pnpm db:seed` to create it.",
    };
  }

  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await auth.signOut();
  redirect("/");
}
