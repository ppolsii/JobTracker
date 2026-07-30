"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

import {
  APPLICATION_STATUS_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
} from "@/features/applications/constants/application.constants";
import { CALENDAR_EVENT_TYPE_LABELS } from "@/features/calendar/constants/calendar.constants";
import type { CalendarEventType } from "@/features/calendar/types/calendar.types";
import { Input } from "@/shared/components/ui/input";
import {
  createSelectItemLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const DEBOUNCE_MS = 300;
const ANY_VALUE = "__any__";

interface CalendarFilterBarProps {
  defaultValues: {
    query: string;
    companyId: string;
    eventType: string;
    applicationStatus: string;
    dateFrom: string;
    dateTo: string;
    workMode: string;
    employmentType: string;
  };
  companies: { id: string; name: string }[];
}

// "CALENDAR FILTERS"/"SEARCH": the same URL-searchParams-driven pattern
// ApplicationFilterBar/AdvancedAnalyticsFilterBar already established.
export function CalendarFilterBar({
  defaultValues,
  companies,
}: CalendarFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams);
    mutate(params);
    router.push(`${pathname}?${params.toString()}`);
  }

  function setParam(key: string, value: string | null) {
    navigate((params) => {
      if (value && value !== ANY_VALUE) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
  }

  function setParamDebounced(key: string, value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setParam(key, value), DEBOUNCE_MS);
  }

  const eventTypeOptions = Object.keys(
    CALENDAR_EVENT_TYPE_LABELS
  ) as CalendarEventType[];

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        placeholder="Search company, position, or notes..."
        defaultValue={defaultValues.query}
        onChange={(e) => setParamDebounced("query", e.target.value)}
        className="max-w-sm"
        aria-label="Search calendar events"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          aria-label="Date from"
          defaultValue={defaultValues.dateFrom}
          onChange={(e) => setParamDebounced("dateFrom", e.target.value)}
          className="w-auto"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          aria-label="Date to"
          defaultValue={defaultValues.dateTo}
          onChange={(e) => setParamDebounced("dateTo", e.target.value)}
          className="w-auto"
        />

        <Select
          value={defaultValues.companyId || ANY_VALUE}
          onValueChange={(value) => setParam("companyId", value)}
          itemToStringLabel={createSelectItemLabel(ANY_VALUE, "Company", (value) =>
            companies.find((company) => company.id === value)?.name
          )}
        >
          <SelectTrigger aria-label="Filter by company">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>Any company</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={defaultValues.eventType || ANY_VALUE}
          onValueChange={(value) => setParam("eventType", value)}
          itemToStringLabel={createSelectItemLabel(
            ANY_VALUE,
            "Event type",
            (value) =>
              CALENDAR_EVENT_TYPE_LABELS[value as CalendarEventType]
          )}
        >
          <SelectTrigger aria-label="Filter by event type">
            <SelectValue placeholder="Event type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>Any event type</SelectItem>
            {eventTypeOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {CALENDAR_EVENT_TYPE_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={defaultValues.applicationStatus || ANY_VALUE}
          onValueChange={(value) => setParam("applicationStatus", value)}
          itemToStringLabel={createSelectItemLabel(ANY_VALUE, "Status")}
        >
          <SelectTrigger aria-label="Filter by application status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>Any status</SelectItem>
            {APPLICATION_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={defaultValues.workMode || ANY_VALUE}
          onValueChange={(value) => setParam("workMode", value)}
          itemToStringLabel={createSelectItemLabel(ANY_VALUE, "Work mode")}
        >
          <SelectTrigger aria-label="Filter by work mode">
            <SelectValue placeholder="Work mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>Any work mode</SelectItem>
            {WORK_MODE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={defaultValues.employmentType || ANY_VALUE}
          onValueChange={(value) => setParam("employmentType", value)}
          itemToStringLabel={createSelectItemLabel(
            ANY_VALUE,
            "Employment type"
          )}
        >
          <SelectTrigger aria-label="Filter by employment type">
            <SelectValue placeholder="Employment type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>Any employment type</SelectItem>
            {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
