import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { env } from "@/config/env";
import { siteConfig } from "@/config/site";
import { SupabaseSessionSync } from "@/features/auth/components/SupabaseSessionSync";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import { Toaster } from "@/shared/components/ui/sonner";

import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// "SEO": `metadataBase` lets every page's relative OpenGraph/Twitter image
// resolve to an absolute URL without repeating env.appUrl per page - the
// marketing pages (Phase 37) are the first to actually populate
// `openGraph`/`twitter`, but this belongs at the root so it applies
// uniformly (dashboard pages inherit it too, harmlessly, since they're
// already excluded from indexing via robots.ts).
export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  openGraph: {
    siteName: siteConfig.name,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <SupabaseSessionSync />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
