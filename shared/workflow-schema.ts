import { z } from "zod";
import { bridgeActionSchema } from "./bridge-protocol";

export const workflowStepSchema = z.object({
  index: z.number().int().nonnegative(),
  key: z.string().min(1),
  action: bridgeActionSchema,
  retryPolicy: z.enum(["SAFE_RETRY", "UNSAFE_RETRY"]).default("UNSAFE_RETRY"),
  maxAttempts: z.number().int().positive().default(1),
  timeoutMs: z.number().int().positive().default(15_000),
  checkpoint: z.boolean().default(false),
  onFound: z.object({ jumpTo: z.number().int().nonnegative() }).optional(),
});

export const workflowDefinitionSchema = z.object({
  key: z.string().min(1), version: z.number().int().positive(), name: z.string().min(1),
  kind: z.enum(["ORDER_DRIVEN", "BATCH", "SWEEP"]), steps: z.array(workflowStepSchema).min(1),
}).superRefine((definition, ctx) => {
  for (const [position, step] of definition.steps.entries()) {
    if (step.retryPolicy === "UNSAFE_RETRY" && definition.steps[position - 1]?.action.kind !== "CHECK_EXISTS") {
      ctx.addIssue({ code: "custom", path: ["steps", position, "retryPolicy"], message: "UNSAFE_RETRY requires an immediately preceding PRE_FLIGHT_CHECK" });
    }
  }
});

export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;
