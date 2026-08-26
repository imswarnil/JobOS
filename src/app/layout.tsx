import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import Script from "next/script";

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
 * Runs before first paint so both the theme and the sidebar state are on
 * <html> by the time any pixels land. Without it a dark-mode user gets a white
 * flash on every fresh document, and a collapsed rail renders expanded and
 * then snaps shut. Kept as a string so it ships inline rather than as a
 * fetched module.
 */
const BOOT_SCRIPT = `
(function () {
  var el = document.documentElement;
  try {
    var stored = localStorage.getItem('jobos-theme');
    var dark = stored
      ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    el.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {
    el.setAttribute('data-theme', 'light');
  }
  try {
    el.dataset.rail =
      localStorage.getItem('jobos-rail') === 'collapsed' ? 'collapsed' : 'expanded';
  } catch (e) {
    el.dataset.rail = 'expanded';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${figtree.variable} antialiased`}>
        {/*
          `beforeInteractive` puts this in the initial HTML ahead of hydration,
          which is the only way it can do its job. A bare <script> in <head>
          also lands in the HTML, but React 19 refuses to render one inside a
          component tree and warns that it will never execute on the client.
        */}
        <Script
          id="jobos-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }}
        />
        {children}
      </body>
    </html>
  );
}
