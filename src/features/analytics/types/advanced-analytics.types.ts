import type {
  ApplicationStatus,
  EmploymentType,
  WorkMode,
} from "@/features/applications/types/application.types";
import type {
  EmploymentTypeAnalyticsRow,
  FunnelStageRow,
  GroupAnalyticsRow,
  WorkModeAnalyticsRow,
} from "@/features/analytics/types/analytics.types";

// IMPLEMENTATION_ORDER_V2.md Phase 33 (Advanced Analytics) "FILTERS". Every
// field is optional - an unfiltered request is simply an empty object, not
// a separate code path. `status` here means "current_status", matching the
// Applications list page's own filter naming.
export interface AdvancedAnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  companyId?: string;
  cvVersionId?: string;
  workMode?: WorkMode;
  employmentType?: EmploymentType;
  status?: ApplicationStatus;
}

// "SECTION 2 Company Performance": "top companies" / "worst companies" -
// GroupAnalyticsRow is reused as-is (same shape Company Analytics on the
// base Analytics page already uses); this only adds the ranking and the
// account-wide average on top.
export interface CompanyRanking {
  top: GroupAnalyticsRow[];
  worst: GroupAnalyticsRow[];
  averageResponseTimeDays: number | null;
}

// "SECTION 4 Timeline Analysis": one consecutive stage-to-stage step.
export interface TimelineStep {
  from: string;
  to: string;
  averageDays: number | null;
}

export interface ProcessDurations {
  fastestDays: number | null;
  slowestDays: number | null;
  medianDays: number | null;
  sampleSize: number;
}

export interface TimelineAnalysis {
  steps: TimelineStep[];
  process: ProcessDurations;
}

// "SECTION 5 Job Search Activity".
export interface WeeklyActivity {
  week: string;
  applications: number;
}

export interface MonthActivity {
  month: string;
  applications: number;
}

export interface ActivityAnalysis {
  perWeek: WeeklyActivity[];
  currentStreakDays: number;
  longestStreakDays: number;
  mostActiveMonth: MonthActivity | null;
  leastActiveMonth: MonthActivity | null;
}

// "SECTION 8 Salary". Every numeric field is nullable - "Missing salary
// data must never break analytics" (no salary data at all is a normal,
// zero-sample-size state, not an error).
export interface SalaryStatistics {
  sampleSize: number;
  min: number | null;
  max: number | null;
  average: number | null;
  median: number | null;
}

export interface SalaryDistributionBucket {
  rangeLabel: string;
  count: number;
}

export interface SalaryByGroupRow {
  id: string;
  name: string;
  averageSalary: number | null;
  sampleSize: number;
}

export interface SalaryAnalysis {
  statistics: SalaryStatistics;
  distribution: SalaryDistributionBucket[];
  byCompany: SalaryByGroupRow[];
  byWorkMode: SalaryByGroupRow[];
}

export interface AdvancedAnalyticsSummary {
  funnel: FunnelStageRow[];
  companyAnalytics: GroupAnalyticsRow[];
  companyRanking: CompanyRanking;
  cvAnalytics: GroupAnalyticsRow[];
  timeline: TimelineAnalysis;
  activity: ActivityAnalysis;
  workModeAnalytics: WorkModeAnalyticsRow[];
  employmentTypeAnalytics: EmploymentTypeAnalyticsRow[];
  salary: SalaryAnalysis;
  // Deterministic sentences only, same contract as the base page's own
  // `insights` (ANALYTICS_ENGINE.md "Insights": "never speculate").
  insights: string[];
}
