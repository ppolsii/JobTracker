import { Skeleton } from "@/shared/components/ui/skeleton";

// UI_SYSTEM.md "Loading States": "Every asynchronous operation should
// display loading feedback. Use Skeleton Components whenever possible.
// Avoid layout shifts." Used as every dashboard route's `loading.tsx`
// Suspense fallback (Phase 16 "Improve loading states") - a generic shape
// approximating a heading plus a content block is enough here, since the
// goal is immediate feedback while the Server Component's data fetch
// resolves, not a pixel-exact preview of that page's real content.
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
