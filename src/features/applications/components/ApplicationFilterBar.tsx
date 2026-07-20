"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

import {
  APPLICATION_SORT_OPTIONS,
  APPLICATION_SOURCE_OPTIONS,
  APPLICATION_STATUS_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
} from "@/features/applications/constants/application.constants";
import { Button } from "@/shared/components/ui/button";
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

interface ApplicationFilterBarProps {
  defaultValues: {
    query: string;
    status: string;
    company_id: string;
    cv_version_id: string;
    source: string;
    work_mode: string;
    employment_type: string;
    date_from: string;
    date_to: string;
    salary_min: string;
    salary_max: string;
    sort_by: string;
    sort_dir: string;
  };
  companies: { id: string; name: string }[];
  cvVersions: { id: string; name: string }[];
}

// BUSINESS_RULES.md "Filtering": "Filters must be combinable" - every control
// here independently updates the shared URL searchParams, matching
// CompanySearchBar's URL-driven pattern. Sorting is server-side (real SQL
// ORDER BY across the full dataset, not just the current page) since,
// unlike Companies/CV Versions, Applications has a hard pagination *and*
// sorting requirement at the same time - so DataTable's built-in per-page
// client sort would silently only reorder the visible page. ApplicationsTable
// therefore marks no column as sortable; sorting lives here instead.
export function ApplicationFilterBar({
  defaultValues,
  companies,
  cvVersions,
}: ApplicationFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams);
    mutate(params);
    params.delete("page");
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

  function toggleSortDir() {
    setParam("sort_dir", defaultValues.sort_dir === "asc" ? "desc" : "asc");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          placeholder="Search by position..."
          defaultValue={defaultValues.query}
          onChange={(e) => setParamDebounced("query", e.target.value)}
          className="max-w-xs"
          aria-label="Search applications"
        />

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

        <Select
          value={defaultValues.company_id || ANY_VALUE}
          onValueChange={(value) => setParam("company_id", value)}
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
          value={defaultValues.cv_version_id || ANY_VALUE}
          onValueChange={(value) => setParam("cv_version_id", value)}
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
          value={defaultValues.source || ANY_VALUE}
          onValueChange={(value) => setParam("source", value)}
        >
          <SelectTrigger aria-label="Filter by source">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>Any source</SelectItem>
            {APPLICATION_SOURCE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={defaultValues.work_mode || ANY_VALUE}
          onValueChange={(value) => setParam("work_mode", value)}
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
          value={defaultValues.employment_type || ANY_VALUE}
          onValueChange={(value) => setParam("employment_type", value)}
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

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          aria-label="Application date from"
          defaultValue={defaultValues.date_from}
          onChange={(e) => setParamDebounced("date_from", e.target.value)}
          className="w-auto"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          aria-label="Application date to"
          defaultValue={defaultValues.date_to}
          onChange={(e) => setParamDebounced("date_to", e.target.value)}
          className="w-auto"
        />

        <Input
          type="number"
          placeholder="Min salary"
          aria-label="Minimum salary"
          defaultValue={defaultValues.salary_min}
          onChange={(e) => setParamDebounced("salary_min", e.target.value)}
          className="w-32"
        />
        <Input
          type="number"
          placeholder="Max salary"
          aria-label="Maximum salary"
          defaultValue={defaultValues.salary_max}
          onChange={(e) => setParamDebounced("salary_max", e.target.value)}
          className="w-32"
        />

        <Select
          value={defaultValues.sort_by}
          onValueChange={(value) => setParam("sort_by", value)}
        >
          <SelectTrigger aria-label="Sort by">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {APPLICATION_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={
            defaultValues.sort_dir === "asc"
              ? "Sort descending"
              : "Sort ascending"
          }
          onClick={toggleSortDir}
        >
          {defaultValues.sort_dir === "asc" ? (
            <ArrowUp className="size-4" />
          ) : (
            <ArrowDown className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
