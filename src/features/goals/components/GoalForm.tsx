"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { createGoalAction, updateGoalAction } from "@/features/goals/actions/goal.actions";
import {
  GOAL_METRIC_LABELS,
  GOAL_METRIC_OPTIONS,
  GOAL_PERIOD_LABELS,
  GOAL_PERIOD_OPTIONS,
} from "@/features/goals/constants/goal.constants";
import {
  createGoalSchema,
  type CreateGoalSchemaOutput,
} from "@/features/goals/schemas/goal.schema";
import type { GoalRecord } from "@/features/goals/types/goal.types";
import { Button } from "@/shared/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

// react-hook-form needs the pre-parse (input) shape here, distinct from
// CreateGoalSchemaOutput (post-parse) - createGoalSchema coerces
// targetValue to a number, so defaultValues/register hold whatever the
// number input actually produces before validation runs (the same 3-generic
// pattern ApplicationForm/JobImportReviewForm already established for this
// exact z.coerce.number() gotcha).
type GoalFormValues = z.input<typeof createGoalSchema>;

interface GoalFormProps {
  goal?: GoalRecord;
  onSuccess: () => void;
  onCancel: () => void;
}

// "GOAL MANAGEMENT - Create/Edit". Reused for both (the same `goal?`
// optional-record pattern every other form in this codebase already uses).
export function GoalForm({ goal, onSuccess, onCancel }: GoalFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues, unknown, CreateGoalSchemaOutput>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      metric: goal?.metric ?? "applications",
      period: goal?.period ?? "weekly",
      targetValue: goal?.target_value ?? undefined,
      title: goal?.title ?? "",
    },
  });

  async function onSubmit(values: CreateGoalSchemaOutput) {
    const result = goal
      ? await updateGoalAction({ id: goal.id, ...values })
      : await createGoalAction(values);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(goal ? "Goal updated." : "Goal created.");
    onSuccess();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <FieldGroup>
        <Field data-invalid={!!errors.metric}>
          <FieldLabel htmlFor="metric" required>
            Metric
          </FieldLabel>
          <Controller
            name="metric"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                itemToStringLabel={(value) =>
                  GOAL_METRIC_LABELS[value as keyof typeof GOAL_METRIC_LABELS]
                }
              >
                <SelectTrigger id="metric" className="w-full">
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_METRIC_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {GOAL_METRIC_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.metric]} />
        </Field>

        <Field data-invalid={!!errors.period}>
          <FieldLabel htmlFor="period" required>
            Period
          </FieldLabel>
          <Controller
            name="period"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                itemToStringLabel={(value) =>
                  GOAL_PERIOD_LABELS[value as keyof typeof GOAL_PERIOD_LABELS]
                }
              >
                <SelectTrigger id="period" className="w-full">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {GOAL_PERIOD_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.period]} />
        </Field>

        <Field data-invalid={!!errors.targetValue}>
          <FieldLabel htmlFor="targetValue" required>
            Target
          </FieldLabel>
          <Input
            id="targetValue"
            type="number"
            min={1}
            step={1}
            {...register("targetValue")}
          />
          <FieldError errors={[errors.targetValue]} />
        </Field>

        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            placeholder="Optional - defaults to e.g. &quot;Applications - Weekly&quot;"
            {...register("title")}
          />
          <FieldError errors={[errors.title]} />
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {goal ? "Save changes" : "Create goal"}
        </Button>
      </div>
    </form>
  );
}
