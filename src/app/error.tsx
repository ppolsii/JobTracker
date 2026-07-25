"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ROUTES } from "@/config/routes";
import { captureException } from "@/lib/monitoring";
import { Button } from "@/shared/components/ui/button";

// "ERROR HANDLING": "500, Unexpected failures." Next.js's own error
// boundary convention (must be a Client Component) - catches any
// unhandled exception thrown while rendering a route segment, instead of
// falling through to a generic, unbranded default page. `reset()` re-
// renders the segment, matching Next's own documented recovery pattern.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. Your data is safe - please try again,
        or head back to the Dashboard.
      </p>
      <div className="flex gap-2">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<Link href={ROUTES.DASHBOARD} />}
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
