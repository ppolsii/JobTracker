import Link from "next/link";

import { ROUTES } from "@/config/routes";
import { Button } from "@/shared/components/ui/button";

// "ERROR HANDLING": "404." Next.js's own not-found convention - shown for
// any route that doesn't match a page, replacing the framework's generic
// default with something on-brand.
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have been
        moved.
      </p>
      <Button type="button" nativeButton={false} render={<Link href={ROUTES.HOME} />}>
        Go home
      </Button>
    </div>
  );
}
