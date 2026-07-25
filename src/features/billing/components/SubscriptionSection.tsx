import { AlertTriangle } from "lucide-react";

import { ManageSubscriptionButton } from "@/features/billing/components/ManageSubscriptionButton";
import { UpgradeButton } from "@/features/billing/components/UpgradeButton";
import { UsageIndicator } from "@/features/billing/components/UsageIndicator";
import type { Subscription } from "@/features/billing/types/billing.types";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/shared/components/ui/badge";

// Mirrors the Application Detail page's own InfoRow shape (not shared/ - a
// two-line presentational row isn't worth a cross-feature export, and this
// phase's own instructions say not to touch unrelated features).
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

// BUSINESS_RULES.md "Billing": status mirrors Stripe's own value exactly,
// "never reinterpreted" - this only reformats the enum's casing/underscores
// for display, it does not change its meaning.
function formatStatus(status: Subscription["status"]): string {
  if (!status) return "—";
  return status
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

const BILLING_INTERVAL_LABELS: Record<
  NonNullable<Subscription["billing_interval"]>,
  string
> = {
  month: "Monthly",
  year: "Yearly",
};

// "PAYMENT FAILURE": derived from `status` alone - never a separate stored
// "payment status" column (that would duplicate what `status` already
// means; see billing-webhook.service.ts's own note on why `past_due` still
// grants Pro access during this grace period).
function isPaymentFailing(status: Subscription["status"]): boolean {
  return status === "past_due" || status === "unpaid";
}

// Phase 31.5 (Pro Plan Foundation), production billing wired in Phase 38.
// Purely presentational - every value shown here was already decided by
// BillingService/the Stripe webhook; this component makes no entitlement
// decision of its own.
export function SubscriptionSection({
  subscription,
  usage,
}: {
  subscription: Subscription | null;
  usage: { used: number; limit: number | null } | null;
}) {
  const isPro = subscription?.plan === "pro";
  const isCancelling = Boolean(subscription?.cancel_at) && subscription?.status !== "canceled";
  const paymentFailing = isPaymentFailing(subscription?.status ?? null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        {isPro
          ? "You're currently enjoying all Pro features."
          : "You are currently using the Free plan."}
      </p>

      {paymentFailing ? (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Your last payment didn&apos;t go through. Update your payment
            method from Manage Subscription to keep your Pro access.
          </span>
        </div>
      ) : null}

      {isCancelling && subscription?.cancel_at ? (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-500">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Your subscription is set to end on{" "}
            {formatDateTime(subscription.cancel_at)}. You can resume it any
            time from Manage Subscription before then.
          </span>
        </div>
      ) : null}

      <div className="flex flex-col text-sm">
        <InfoRow
          label="Current plan"
          value={
            <Badge variant={isPro ? "default" : "secondary"}>
              {isPro ? "Pro" : "Free"}
            </Badge>
          }
        />
        <InfoRow
          label="Status"
          value={formatStatus(subscription?.status ?? null)}
        />
        <InfoRow
          label={isCancelling ? "Ends on" : "Renewal date"}
          value={
            subscription?.current_period_end
              ? formatDateTime(subscription.current_period_end)
              : "—"
          }
        />
        <InfoRow
          label="Billing interval"
          value={
            subscription?.billing_interval
              ? BILLING_INTERVAL_LABELS[subscription.billing_interval]
              : "—"
          }
        />
      </div>

      {!isPro && usage && usage.limit !== null ? (
        <UsageIndicator used={usage.used} limit={usage.limit} />
      ) : null}

      <div className="flex flex-wrap gap-2">
        {isPro ? (
          <ManageSubscriptionButton />
        ) : (
          <>
            <UpgradeButton interval="month">Upgrade monthly</UpgradeButton>
            <UpgradeButton interval="year" variant="outline">
              Upgrade yearly
            </UpgradeButton>
          </>
        )}
      </div>
    </div>
  );
}
