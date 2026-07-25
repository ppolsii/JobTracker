import { z } from "zod";

import {
  GOAL_METRIC_OPTIONS,
  GOAL_PERIOD_OPTIONS,
} from "@/features/goals/constants/goal.constants";

// "GOAL MANAGEMENT - Create/Edit". `targetValue` must be a positive whole
// number - a goal of "0 applications" or a fractional target has no
// meaning.
export const createGoalSchema = z.object({
  metric: z.enum(GOAL_METRIC_OPTIONS),
  period: z.enum(GOAL_PERIOD_OPTIONS),
  targetValue: z.coerce
    .number()
    .int("Target must be a whole number.")
    .positive("Target must be greater than zero."),
  title: z.string().trim().max(255).optional(),
});
export type CreateGoalSchemaInput = z.input<typeof createGoalSchema>;
export type CreateGoalSchemaOutput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = createGoalSchema.extend({
  id: z.string().uuid(),
});
export type UpdateGoalSchemaInput = z.input<typeof updateGoalSchema>;

// Pause / Reactivate / Archive / Delete all act on a single goal by id -
// one shared schema shape for all four actions.
export const goalIdSchema = z.object({
  id: z.string().uuid(),
});
export type GoalIdInput = z.infer<typeof goalIdSchema>;
