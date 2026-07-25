import { USAGE_WARNING_RATIO } from "@/features/billing/constants/billing.constants";

export type UsageStatus = "ok" | "approaching-limit" | "at-limit";

// Pure helper behind the Usage Indicator (Phase 31.5 - Pro Plan
// Foundation), split out so its thresholds are testable without rendering
// anything (CODE_STYLE.md "Testing": "Keep pure functions whenever
// possible"). `limit` is always the Free plan's actual limit here - callers
// never invoke this for a Pro user (who has no limit to be "at" or
// "approaching").
export function getUsageStatus(used: number, limit: number): UsageStatus {
  if (used >= limit) return "at-limit";
  if (limit > 0 && used / limit >= USAGE_WARNING_RATIO) return "approaching-limit";
  return "ok";
}
