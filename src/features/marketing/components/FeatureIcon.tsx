import {
  Award,
  Bell,
  Briefcase,
  CalendarDays,
  FileText,
  History,
  MessageSquare,
  Rocket,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

// One lookup keyed by FEATURE_HIGHLIGHTS' own `key`, mirroring the
// CalendarEventIcon/AchievementIcon/NotificationIcon precedent - icon
// choice lives in the component layer, not in the constants data.
const FEATURE_ICONS: Record<string, LucideIcon> = {
  "application-tracking": Briefcase,
  companies: Users,
  "cv-management": FileText,
  timeline: History,
  "interview-feedback": MessageSquare,
  "smart-job-import": Rocket,
  "advanced-analytics": TrendingUp,
  calendar: CalendarDays,
  goals: Target,
  achievements: Award,
  notifications: Bell,
};

export function FeatureIcon({
  featureKey,
  className,
}: {
  featureKey: string;
  className?: string;
}) {
  const Icon = FEATURE_ICONS[featureKey] ?? Briefcase;
  return <Icon className={className} aria-hidden="true" />;
}
