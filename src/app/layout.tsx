import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Figtree } from "next/font/google";

import { RAIL_COOKIE, THEME_COOKIE, isTheme } from "@/lib/preferences";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";

import "./globals.css";

/**
 * One face for the whole product. Figtree has a tall x-height and open
 * apertures, so it stays readable at the 11–13px the sidebar and metadata
 * labels run at, and it has enough weight range (400/500/600/700) to carry
 * the hierarchy that Frame & Signal normally splits across three families.
 */
const figtree = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "JobOS — career operating system",
    template: "%s · JobOS",
  },
  description:
    "Log the work, build the resume, tailor it to the role, and track every application — one system for your whole career.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#08080c" },
  ],
  // Standalone installs run under the notch on modern phones; without this
  // the app renders in the safe area and looks letterboxed.
  viewportFit: "cover",
};

/**
 * The theme and the rail state come from cookies, read here on the server.
 *
 * That is what removes the flash: the attributes are in the HTML from the
 * first byte, so a dark-mode user never sees a white flare and a collapsed
 * rail never expands and snaps shut. The usual inline-script trick is not
 * available — React 19 will not render a script tag inside a component tree,
 * and next/script's beforeInteractive hits the same wall in the App Router.
 *
 * **"system" renders no attribute at all**, which is the important detail.
 * The server cannot know the OS preference, so resolving it here would mean
 * guessing — and guessing light for an OS-dark visitor reintroduces exactly
 * the flash we are removing. Omitting the attribute hands the decision to the
 * `prefers-color-scheme` block in globals.css, which is already written to
 * apply to `:root:not([data-theme="light"])`. No JavaScript is involved in
 * getting a system-preference visitor the right theme.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const stored = store.get(THEME_COOKIE)?.value;
  const explicit = isTheme(stored) && stored !== "system" ? stored : undefined;
  const rail =
    store.get(RAIL_COOKIE)?.value === "collapsed" ? "collapsed" : "expanded";

  return (
    <html
      lang="en"
      data-theme={explicit}
      data-rail={rail}
      suppressHydrationWarning
    >
      <body className={`${figtree.variable} antialiased`}>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
