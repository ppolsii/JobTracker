"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { CalendarView } from "@/features/calendar/types/calendar.types";
import { Button } from "@/shared/components/ui/button";

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "agenda", label: "Agenda" },
];

// "CALENDAR VIEWS": "Users can switch between views." URL-driven (the same
// searchParams convention every other filter/sort control in this codebase
// already uses), so a view choice is combinable with filters and shareable
// via the URL.
export function CalendarViewSwitcher({
  activeView,
}: {
  activeView: CalendarView | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setView(view: CalendarView) {
    const params = new URLSearchParams(searchParams);
    params.set("view", view);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1">
      {VIEWS.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={activeView === option.value ? "default" : "outline"}
          onClick={() => setView(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
