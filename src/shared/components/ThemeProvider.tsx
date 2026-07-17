"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes was pulled in as a transitive dependency of shadcn's own
// sonner.tsx recipe (it syncs toast colors via next-themes' useTheme()).
// Since it's present either way, it's used here as the single source of
// truth for theme state rather than hand-rolling a redundant parallel
// system. attribute="class" matches the .dark class variant already wired
// into globals.css.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
