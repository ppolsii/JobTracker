import {
  Award,
  Briefcase,
  Flame,
  Gift,
  Medal,
  Rocket,
  Sparkles,
  Star,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

// One lookup, mirroring CalendarEventIcon's own precedent - "no
// achievement-specific logic should exist in the components that render
// them" beyond this single mapping.
const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  first_application: Rocket,
  applications_10: Star,
  applications_50: Medal,
  applications_100: Trophy,
  first_interview: Users,
  first_offer: Gift,
  first_accepted_offer: Award,
  interview_master: Briefcase,
  offer_hunter: Sparkles,
  consistent_week: Flame,
  streak_30_days: Flame,
};

export function AchievementIcon({
  achievementKey,
  className,
}: {
  achievementKey: string;
  className?: string;
}) {
  const Icon = ACHIEVEMENT_ICONS[achievementKey] ?? Trophy;
  return <Icon className={className} />;
}
