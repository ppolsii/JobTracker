import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// BUSINESS_RULES.md "Time": "All timestamps stored in UTC. Displayed using
// user's local timezone." Must only be called client-side (the server has
// no knowledge of the visitor's timezone) - callers render it inside a
// "use client" component with `suppressHydrationWarning` on the element, the
// standard Next.js pattern for values that legitimately differ between the
// server's first-pass render and the client's corrected one.
export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
