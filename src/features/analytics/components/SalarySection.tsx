import type { SalaryAnalysis } from "@/features/analytics/types/advanced-analytics.types";
import { EmptyState } from "@/shared/components/EmptyState";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value === null ? "—" : value}</p>
      </CardContent>
    </Card>
  );
}

function GroupList({
  title,
  rows,
}: {
  title: string;
  rows: SalaryAnalysis["byCompany"];
}) {
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium">{title}</h4>
      <ul className="flex flex-col gap-1 text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{row.name}</span>
            <span className="font-medium">
              {row.averageSalary === null ? "—" : row.averageSalary}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// "SECTION 8 Salary". "Missing salary data must never break analytics" - a
// zero-sample-size result renders the same empty state every other section
// uses, not an error.
export function SalarySection({ salary }: { salary: SalaryAnalysis }) {
  if (salary.statistics.sampleSize === 0) {
    return (
      <EmptyState
        title="No salary data yet"
        description="Record a salary range on your applications to see salary insights here."
      />
    );
  }

  const maxBucketCount = Math.max(
    ...salary.distribution.map((bucket) => bucket.count)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Minimum" value={salary.statistics.min} />
        <StatCard label="Maximum" value={salary.statistics.max} />
        <StatCard label="Average" value={salary.statistics.average} />
        <StatCard label="Median" value={salary.statistics.median} />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Salary distribution</p>
        {salary.distribution.map((bucket) => (
          <div key={bucket.rangeLabel} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0 text-muted-foreground">
              {bucket.rangeLabel}
            </span>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width:
                    maxBucketCount > 0
                      ? `${Math.round((bucket.count / maxBucketCount) * 100)}%`
                      : "0%",
                }}
              />
            </div>
            <span className="w-6 shrink-0 text-right font-medium">
              {bucket.count}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <GroupList title="Average salary by company" rows={salary.byCompany} />
        <GroupList title="Average salary by work mode" rows={salary.byWorkMode} />
      </div>
    </div>
  );
}
