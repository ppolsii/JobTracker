import {
  BarChart3,
  Briefcase,
  Building2,
  FileText,
  LayoutDashboard,
  Settings,
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
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: "Applications", href: ROUTES.APPLICATIONS, icon: Briefcase },
  { label: "Companies", href: ROUTES.COMPANIES, icon: Building2 },
  { label: "CV Versions", href: ROUTES.CV_VERSIONS, icon: FileText },
  { label: "Analytics", href: ROUTES.ANALYTICS, icon: BarChart3 },
  { label: "Settings", href: ROUTES.SETTINGS, icon: Settings },
];
