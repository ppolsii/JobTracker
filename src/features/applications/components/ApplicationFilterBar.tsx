"use client";

import { ArrowDown, ArrowUp, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

import {
  APPLICATION_SORT_OPTIONS,
  APPLICATION_SOURCE_OPTIONS,
  APPLICATION_STATUS_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
} from "@/features/applications/constants/application.constants";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
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

// IMPLEMENTATION_ORDER_V2.md Phase 40 "APPLICATION FILTERS": only Search/
// Status/Company are visible by default - every other filter (CV version,
// Source, Work mode, Employment type, Date range, Salary range, Sort)
// lives inside a collapsed "More filters" panel, reusing the Accordion
// primitive Phase 37 already added rather than a new disclosure component.
// BUSINESS_RULES.md "Filtering": "Filters must be combinable" - unchanged,
// every control still independently updates the shared URL searchParams;
// collapsing the panel doesn't clear whichever of those filters are
// already active, so a value set inside "More filters" stays applied (and
// the count badge below tells the user it's there) even while collapsed.
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

  const moreFiltersActiveCount = [
    defaultValues.cv_version_id,
    defaultValues.source,
    defaultValues.work_mode,
    defaultValues.employment_type,
    defaultValues.date_from,
    defaultValues.date_to,
    defaultValues.salary_min,
    defaultValues.salary_max,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-1">
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
      </div>

      <Accordion
        defaultValue={moreFiltersActiveCount > 0 ? ["more-filters"] : []}
      >
        <AccordionItem value="more-filters" className="border-b-0">
          <AccordionTrigger className="w-fit gap-2 py-2 text-sm font-normal text-muted-foreground hover:no-underline hover:text-foreground">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="size-3.5" />
              More filters
              {moreFiltersActiveCount > 0 ? ` (${moreFiltersActiveCount})` : ""}
            </span>
          </AccordionTrigger>
          <AccordionPanel className="pl-0">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={defaultValues.cv_version_id || ANY_VALUE}
                  onValueChange={(value) => setParam("cv_version_id", value)}
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
                    <SelectItem value={ANY_VALUE}>
                      Any employment type
                    </SelectItem>
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
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
