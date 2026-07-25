import type { CompanyRanking } from "@/features/analytics/types/advanced-analytics.types";
import { EmptyState } from "@/shared/components/EmptyState";

function RankedList({
  title,
  rows,
}: {
  title: string;
  rows: CompanyRanking["top"];
}) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium">{title}</h4>
      <ol className="flex flex-col gap-1 text-sm">
        {rows.map((row, index) => (
          <li key={row.id} className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">
              {index + 1}. {row.name}
            </span>
            <span className="font-medium">
              {row.interviewRate === null ? "—" : `${row.interviewRate}%`}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// "SECTION 2 Company Performance": "top companies"/"worst companies" plus
// the account-wide average response time - purely presentational, every
// number was already computed by AnalyticsService.getAdvancedSummary
// (rankCompanies).
export function CompanyRankingList({
  ranking,
}: {
  ranking: CompanyRanking;
}) {
  if (ranking.top.length === 0) {
    return (
      <EmptyState
        title="Not enough company data yet"
        description="Companies need at least a few applications each before a fair ranking can be shown."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <RankedList title="Top companies (by interview rate)" rows={ranking.top} />
        <RankedList title="Worst companies (by interview rate)" rows={ranking.worst} />
      </div>
      {ranking.averageResponseTimeDays !== null ? (
        <p className="text-sm text-muted-foreground">
          Average response time across all companies:{" "}
          <span className="font-medium text-foreground">
            {ranking.averageResponseTimeDays}d
          </span>
        </p>
      ) : null}
    </div>
  );
}
