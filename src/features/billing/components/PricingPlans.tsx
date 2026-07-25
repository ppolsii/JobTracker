import { Check, Minus } from "lucide-react";

import { PLAN_FEATURE_ROWS } from "@/features/billing/constants/billing.constants";
import { UpgradeButton } from "@/features/billing/components/UpgradeButton";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

// Renders one comparison-table cell: a checkmark/dash for a plain boolean
// feature, or the literal string for a described one (e.g. "Up to 15").
function PlanCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span>{value}</span>;
  }
  return value ? (
    <Check className="size-4 text-primary" />
  ) : (
    <Minus className="size-4 text-muted-foreground" />
  );
}

// Phase 31.5 (Pro Plan Foundation). Purely presentational marketing content -
// every row is sourced from PLAN_FEATURE_ROWS (billing.constants.ts), the
// same single source of truth used by the Limit Reached/Upgrade dialogs'
// benefits list, so the plan/comparison copy is never duplicated by hand.
// `isPro` only changes the CTA at the bottom of the Pro card - it does not
// change what's displayed, since the comparison itself is the same for
// every visitor.
export function PricingPlans({ isPro }: { isPro: boolean }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>
              Everything you need to run a real job search.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-3xl font-semibold">$0</p>
            <ul className="flex flex-col gap-2 text-sm">
              {PLAN_FEATURE_ROWS.filter((row) => row.free).map((row) => (
                <li key={row.label} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    {row.label}
                    {typeof row.free === "string" ? ` (${row.free})` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="ring-2 ring-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pro
              <Badge>Recommended</Badge>
            </CardTitle>
            <CardDescription>
              Unlimited applications, plus first access to everything coming
              next.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-2 text-sm">
              {PLAN_FEATURE_ROWS.filter((row) => row.pro).map((row) => (
                <li key={row.label} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    {row.label}
                    {row.comingSoon ? " (Coming Soon)" : ""}
                  </span>
                </li>
              ))}
            </ul>
            {isPro ? (
              <Badge variant="secondary" className="w-fit">
                Your current plan
              </Badge>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <UpgradeButton interval="month" className="flex-1">
                  Upgrade monthly
                </UpgradeButton>
                <UpgradeButton
                  interval="year"
                  variant="outline"
                  className="flex-1"
                >
                  Upgrade yearly
                </UpgradeButton>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-base font-medium">Compare plans</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature</TableHead>
              <TableHead>Free</TableHead>
              <TableHead>Pro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PLAN_FEATURE_ROWS.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="whitespace-normal">
                  {row.label}
                  {row.comingSoon ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      (Coming Soon)
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <PlanCell value={row.free} />
                </TableCell>
                <TableCell>
                  <PlanCell value={row.pro} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
