"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

import { Input } from "@/shared/components/ui/input";

const DEBOUNCE_MS = 300;

// BUSINESS_RULES.md "Search": partial matching, case insensitive - enforced
// server-side in CompanyRepository.list. This just keeps the ?query= URL
// param in sync so the search survives navigation/refresh.
export function CompanySearchBar({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set("query", value);
      } else {
        params.delete("query");
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    }, DEBOUNCE_MS);
  }

  return (
    <Input
      type="search"
      placeholder="Search companies..."
      defaultValue={defaultValue}
      onChange={(e) => handleChange(e.target.value)}
      className="max-w-xs"
      aria-label="Search companies"
    />
  );
}
