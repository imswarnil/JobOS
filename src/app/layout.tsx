import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";

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
};

/**
 * Runs before first paint so the correct theme is on <html> by the time any
 * pixels land — without it, a dark-mode user gets a white flash on every
 * navigation to a fresh document. Kept as a string so it ships inline rather
 * than as a fetched module.
 */
const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('jobos-theme');
    var dark = stored
      ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${figtree.variable} antialiased`}>{children}</body>
    </html>
  );
}
