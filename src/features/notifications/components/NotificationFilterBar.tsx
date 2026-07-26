"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

import { NOTIFICATION_CATEGORY_LABELS } from "@/features/notifications/constants/notification.constants";
import type { NotificationCategory } from "@/features/notifications/types/notification.types";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const DEBOUNCE_MS = 300;
const ANY_VALUE = "__any__";

interface NotificationFilterBarProps {
  defaultValues: {
    query: string;
    unreadOnly: boolean;
    category: string;
    companyId: string;
    dateFrom: string;
    dateTo: string;
  };
  companies: { id: string; name: string }[];
}

const CATEGORY_OPTIONS = Object.keys(
  NOTIFICATION_CATEGORY_LABELS
) as NotificationCategory[];

// "SEARCH": "Filter by: Unread, Type, Application, Company, Date." The
// same URL-searchParams-driven pattern CalendarFilterBar/
// AdvancedAnalyticsFilterBar already established. `applicationId` is
// supported by the underlying schema/filter function (a notification
// already carries one when relevant) but has no dedicated picker here -
// this app has no existing "pick one application from a list" filter
// control anywhere (Company is the established, coarser filter dimension
// every other filter bar already uses instead).
export function NotificationFilterBar({
  defaultValues,
  companies,
}: NotificationFilterBarProps) {
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

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        placeholder="Search notifications..."
        defaultValue={defaultValues.query}
        onChange={(e) => setParamDebounced("query", e.target.value)}
        className="max-w-sm"
        aria-label="Search notifications"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={defaultValues.unreadOnly ? "true" : ANY_VALUE}
          onValueChange={(value) => setParam("unreadOnly", value === "true" ? "true" : null)}
        >
          <SelectTrigger aria-label="Filter by read state">
            <SelectValue placeholder="All notifications" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>All notifications</SelectItem>
            <SelectItem value="true">Unread only</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={defaultValues.category || ANY_VALUE}
          onValueChange={(value) => setParam("category", value)}
          itemToStringLabel={(value: string) =>
            value === ANY_VALUE
              ? "Any category"
              : (NOTIFICATION_CATEGORY_LABELS[
                  value as keyof typeof NOTIFICATION_CATEGORY_LABELS
                ] ?? value)
          }
        >
          <SelectTrigger aria-label="Filter by category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>Any category</SelectItem>
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {NOTIFICATION_CATEGORY_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={defaultValues.companyId || ANY_VALUE}
          onValueChange={(value) => setParam("companyId", value)}
          itemToStringLabel={(value: string) =>
            value === ANY_VALUE
              ? "Any company"
              : (companies.find((company) => company.id === value)?.name ??
                value)
          }
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
      </div>
    </div>
  );
}
