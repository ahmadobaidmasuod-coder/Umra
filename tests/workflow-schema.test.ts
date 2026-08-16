import { describe, expect, it } from "vitest";
import { workflowDefinitionSchema } from "@shared/workflow-schema";

describe("workflow definition safety", () => {
  it("rejects unsafe writes without an immediate pre-flight", () => {
    const result = workflowDefinitionSchema.safeParse({ key: "CREATE", version: 1, name: "Create", kind: "ORDER_DRIVEN", steps: [{ index: 1, key: "SUBMIT", action: { kind: "CLICK", target: "program.submitButton" }, retryPolicy: "UNSAFE_RETRY" }] });
    expect(result.success).toBe(false);
  });
  it("accepts an unsafe write after CHECK_EXISTS", () => {
    const result = workflowDefinitionSchema.safeParse({ key: "CREATE", version: 1, name: "Create", kind: "ORDER_DRIVEN", steps: [
      { index: 1, key: "PRE_FLIGHT_CHECK", action: { kind: "CHECK_EXISTS", target: "program.searchResultByName" }, retryPolicy: "SAFE_RETRY" },
      { index: 2, key: "SUBMIT", action: { kind: "CLICK", target: "program.submitButton" }, retryPolicy: "UNSAFE_RETRY" },
    ] });
    expect(result.success).toBe(true);
  });
});
