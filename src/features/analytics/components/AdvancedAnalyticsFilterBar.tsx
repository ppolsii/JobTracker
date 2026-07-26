"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

import {
  APPLICATION_STATUS_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
} from "@/features/applications/constants/application.constants";
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

interface AdvancedAnalyticsFilterBarProps {
  defaultValues: {
    dateFrom: string;
    dateTo: string;
    companyId: string;
    cvVersionId: string;
    workMode: string;
    employmentType: string;
    status: string;
  };
  companies: { id: string; name: string }[];
  cvVersions: { id: string; name: string }[];
}

// "FILTERS": "Date range, Company, CV Version, Work modality, Employment
// type, Status" - "Filters must be combinable" (BUSINESS_RULES.md
// "Filtering"), the same URL-searchParams-driven pattern
// ApplicationFilterBar already established, mirrored here rather than
// reused directly since this page's field set and target route differ.
export function AdvancedAnalyticsFilterBar({
  defaultValues,
  companies,
  cvVersions,
}: AdvancedAnalyticsFilterBarProps) {
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
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          aria-label="Application date from"
          defaultValue={defaultValues.dateFrom}
          onChange={(e) => setParamDebounced("dateFrom", e.target.value)}
          className="w-auto"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          aria-label="Application date to"
          defaultValue={defaultValues.dateTo}
          onChange={(e) => setParamDebounced("dateTo", e.target.value)}
          className="w-auto"
        />

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

        <Select
          value={defaultValues.cvVersionId || ANY_VALUE}
          onValueChange={(value) => setParam("cvVersionId", value)}
          itemToStringLabel={(value: string) =>
            value === ANY_VALUE
              ? "Any CV version"
              : (cvVersions.find((cvVersion) => cvVersion.id === value)
                  ?.name ?? value)
          }
        >
          <SelectTrigger aria-label="Filter by CV version">
            <SelectValue placeholder="CV version" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>Any CV version</SelectItem>
            {cvVersions.map((cvVersion) => (
              <SelectItem key={cvVersion.id} value={cvVersion.id}>
                {cvVersion.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={defaultValues.workMode || ANY_VALUE}
          onValueChange={(value) => setParam("workMode", value)}
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

        <Select
          value={defaultValues.status || ANY_VALUE}
          onValueChange={(value) => setParam("status", value)}
        >
          <SelectTrigger aria-label="Filter by status">
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
      </div>
    </div>
  );
}
