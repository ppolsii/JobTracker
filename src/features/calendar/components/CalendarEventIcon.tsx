import {
  Award,
  Bell,
  CalendarDays,
  CheckCircle2,
  Code,
  Gift,
  PhoneCall,
  Send,
  Target,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import {
  CALENDAR_EVENT_TYPE_DOT_CLASSNAMES,
  CALENDAR_EVENT_TYPE_LABELS,
} from "@/features/calendar/constants/calendar.constants";
import type { CalendarEventType } from "@/features/calendar/types/calendar.types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

// "EVENT TYPES": "Each event type should have: icon, color, tooltip." One
// lookup, reused by every view (Month/Week/Agenda) and Event Details -
// "no provider-specific [type-specific] logic should exist in UI
// components" beyond this single mapping.
const CALENDAR_EVENT_TYPE_ICONS: Record<CalendarEventType, LucideIcon> = {
  application_submitted: Send,
  recruiter_contact: PhoneCall,
  interview: Users,
  technical_interview: Code,
  final_interview: Award,
  offer_received: Gift,
  offer_accepted: CheckCircle2,
  offer_rejected: XCircle,
  rejected: XCircle,
  reminder: Bell,
  custom: CalendarDays,
  goal_deadline: Target,
};

// "Completed goals should appear visually" (Phase 35): `completed` overrides
// both the dot color (to the same emerald "success" family Offer Accepted
// already uses) and the icon (to a checkmark) for a goal_deadline event
// whose target was reached - undefined/false for every other event, which
// renders exactly as before this phase.
export function CalendarEventIcon({
  type,
  completed,
  className,
}: {
  type: CalendarEventType;
  completed?: boolean;
  className?: string;
}) {
  const Icon = completed ? CheckCircle2 : CALENDAR_EVENT_TYPE_ICONS[type];

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-white",
              completed ? "bg-emerald-500" : CALENDAR_EVENT_TYPE_DOT_CLASSNAMES[type],
              className
            )}
          />
        }
      >
        <Icon className="size-3" />
      </TooltipTrigger>
      <TooltipContent>
        {CALENDAR_EVENT_TYPE_LABELS[type]}
        {completed ? " (achieved)" : ""}
      </TooltipContent>
    </Tooltip>
  );
}
