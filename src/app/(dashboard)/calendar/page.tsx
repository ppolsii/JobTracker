import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { ApplicationPickerService } from "@/features/applications/services/application-picker.service";
import { AuthService } from "@/features/auth/services/auth.service";
import { CalendarBoard } from "@/features/calendar/components/CalendarBoard";
import { CalendarFilterBar } from "@/features/calendar/components/CalendarFilterBar";
import { CalendarGate } from "@/features/calendar/components/CalendarGate";
import { CalendarViewSwitcher } from "@/features/calendar/components/CalendarViewSwitcher";
import { CreateEventButton } from "@/features/calendar/components/CreateEventButton";
import { calendarFiltersSchema } from "@/features/calendar/schemas/calendar.schema";
import { CalendarService } from "@/features/calendar/services/calendar.service";
import type { CalendarView } from "@/features/calendar/types/calendar.types";
import { ERROR_CODES } from "@/shared/constants/error-codes";

export const metadata: Metadata = { title: "Calendar" };

const VALID_VIEWS: CalendarView[] = ["month", "week", "agenda"];

// IMPLEMENTATION_ORDER_V2.md Phase 34 (Calendar & Timeline). Pro-gated
// entirely through CalendarService.getEvents (BillingService.
// requireProPlan); a FORBIDDEN result renders CalendarGate, the same
// pattern Advanced Analytics (Phase 33) and Smart Job Import (Phase 32)
// already established.
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const resolvedSearchParams = await searchParams;
  const filters = calendarFiltersSchema.parse(resolvedSearchParams);
  const requestedView = resolvedSearchParams.view;
  const view = VALID_VIEWS.includes(requestedView as CalendarView)
    ? (requestedView as CalendarView)
    : null;

  const [summaryResult, pickerOptions] = await Promise.all([
    CalendarService.getEvents(user.id, filters, filters.query),
    ApplicationPickerService.getOptions(user.id),
  ]);

  if (!summaryResult.success) {
    if (summaryResult.error.code === ERROR_CODES.FORBIDDEN) {
      return <CalendarGate />;
    }
    return (
      <p className="text-sm text-destructive">{summaryResult.error.message}</p>
    );
  }

  const { events, history, notes, feedback } = summaryResult.data;

  // Derived from the already-loaded events (every application has at least
  // a genesis history entry) - no extra query for the create-event form's
  // "Optional Application" picker.
  const applicationOptions = [
    ...new Map(
      events
        .filter((event) => event.applicationId && event.position)
        .map((event) => [
          event.applicationId as string,
          {
            id: event.applicationId as string,
            label: `${event.position} at ${event.companyName ?? "—"}`,
          },
        ])
    ).values(),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Calendar</h2>
        <div className="flex flex-wrap items-center gap-2">
          <CalendarViewSwitcher activeView={view} />
          <CreateEventButton applicationOptions={applicationOptions} />
        </div>
      </div>

      <CalendarFilterBar
        defaultValues={{
          query: filters.query ?? "",
          companyId: filters.companyId ?? "",
          eventType: filters.eventType ?? "",
          applicationStatus: filters.applicationStatus ?? "",
          dateFrom: filters.dateFrom ?? "",
          dateTo: filters.dateTo ?? "",
          workMode: filters.workMode ?? "",
          employmentType: filters.employmentType ?? "",
        }}
        companies={pickerOptions.companies}
      />

      <CalendarBoard
        events={events}
        history={history}
        notes={notes}
        feedback={feedback}
        view={view}
        applicationOptions={applicationOptions}
      />
    </div>
  );
}
