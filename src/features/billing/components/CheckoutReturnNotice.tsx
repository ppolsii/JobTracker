"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

// "ERROR HANDLING": "Gracefully handle: ... Cancelled Checkout." Stripe
// Checkout's `success_url`/`cancel_url` (BillingCheckoutService) both point
// back to this page with a `checkout` marker - this component only ever
// shows a friendly notice for it, never re-verifies payment itself (the
// webhook, not the return redirect, is the source of truth for entitlements
// - "Never trust client-side state"). The param is stripped from the URL
// immediately after, so refreshing or navigating back never re-shows it.
export function CheckoutReturnNotice() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const checkout = searchParams.get("checkout");

  useEffect(() => {
    if (checkout === "success") {
      toast.success("Thanks! Your subscription is being activated.");
    } else if (checkout === "cancelled") {
      toast.info("Checkout was cancelled - no charge was made.");
    } else {
      return;
    }

    const params = new URLSearchParams(searchParams);
    params.delete("checkout");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the `checkout` param itself changes, not on every searchParams/router identity change.
  }, [checkout]);

  return null;
}
