import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Settings,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";

import { ROUTES } from "@/config/routes";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// Single source of truth for the sidebar/mobile-drawer links and the top
// navigation's current-page title (matched by href) - defined once here so
// both stay in sync (UI_SYSTEM.md "Design Consistency").
// Phase 31.5 (Pro Plan Foundation): "Pricing" added. Its Free-plan-only
// upsell badge is not part of this static list (it depends on the viewing
// user's own plan) - see SidebarNav's `showProBadge` prop.
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: "Applications", href: ROUTES.APPLICATIONS, icon: Briefcase },
  { label: "Companies", href: ROUTES.COMPANIES, icon: Building2 },
  { label: "CV Versions", href: ROUTES.CV_VERSIONS, icon: FileText },
  { label: "Analytics", href: ROUTES.ANALYTICS, icon: BarChart3 },
  { label: "Calendar", href: ROUTES.CALENDAR, icon: CalendarDays },
  { label: "Goals", href: ROUTES.GOALS, icon: Target },
  { label: "Pricing", href: ROUTES.PRICING, icon: Sparkles },
  { label: "Settings", href: ROUTES.SETTINGS, icon: Settings },
];
