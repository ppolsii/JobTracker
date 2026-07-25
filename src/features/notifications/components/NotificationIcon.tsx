import {
  Award,
  Bell,
  Briefcase,
  CalendarDays,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { NotificationCategory } from "@/features/notifications/types/notification.types";

// One lookup, mirroring CalendarEventIcon/AchievementIcon's own precedent -
// "no category-specific logic should exist in the components that render
// them" beyond this single mapping.
const NOTIFICATION_CATEGORY_ICONS: Record<NotificationCategory, LucideIcon> = {
  application: Briefcase,
  interview: Users,
  goal: Target,
  achievement: Award,
  calendar: CalendarDays,
  general: Bell,
};

export function NotificationIcon({
  category,
  className,
}: {
  category: NotificationCategory;
  className?: string;
}) {
  const Icon = NOTIFICATION_CATEGORY_ICONS[category];
  return <Icon className={className} />;
}
