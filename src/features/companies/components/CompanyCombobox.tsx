"use client";

import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { createCompanyAction } from "@/features/companies/actions/company.actions";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/shared/components/ui/combobox";

interface CompanyOption {
  id: string;
  name: string;
}

interface CompanyComboboxProps {
  id?: string;
  value: string;
  options: CompanyOption[];
  onChange: (id: string) => void;
  onCreated: (company: CompanyOption) => void;
  disabled?: boolean;
  "aria-invalid"?: boolean;
}

// IMPLEMENTATION_ORDER_V2.md Phase 40 "COMPANY SELECTION": a GitHub/Linear/
// Notion/Jira-style combobox - typing filters the existing list, and when
// nothing matches, a "+ Create '<query>'" row creates the company inline
// (CompanyService.create, the same Server Action CompanyFormDialog already
// uses) without leaving ApplicationForm. The Companies page remains the
// only place to edit a company's other fields (website/industry/etc) -
// this combobox only ever needs a name to unblock creating an application.
export function CompanyCombobox({
  id,
  value,
  options,
  onChange,
  onCreated,
  disabled,
  "aria-invalid": ariaInvalid,
}: CompanyComboboxProps) {
  const [inputValue, setInputValue] = useState("");
  const [creating, setCreating] = useState(false);
  const emptyId = useId();

  const selected = options.find((company) => company.id === value) ?? null;
  const trimmedQuery = inputValue.trim();

  async function handleCreate() {
    if (!trimmedQuery || creating) return;

    setCreating(true);
    const result = await createCompanyAction({ name: trimmedQuery });
    setCreating(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    onCreated({ id: result.data.id, name: result.data.name });
    onChange(result.data.id);
    setInputValue("");
  }

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(item) => onChange(item ? item.id : "")}
      itemToStringLabel={(company: CompanyOption) => company.name}
      isItemEqualToValue={(a: CompanyOption, b: CompanyOption) => a.id === b.id}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        placeholder="Search or create a company"
        showClear
        aria-invalid={ariaInvalid}
      />
      <ComboboxContent>
        <ComboboxEmpty id={emptyId}>
          {trimmedQuery ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
              onClick={handleCreate}
              disabled={creating}
            >
              <Plus className="size-4" />
              {creating ? "Creating…" : `Create "${trimmedQuery}"`}
            </button>
          ) : (
            "No companies yet. Start typing to create one."
          )}
        </ComboboxEmpty>
        <ComboboxList>
          {(item: CompanyOption) => (
            <ComboboxItem key={item.id} value={item}>
              {item.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
