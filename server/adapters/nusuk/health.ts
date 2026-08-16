import { NUSUK_TARGETS, type RegisteredTargetKey } from "./registry";

export type TargetHealthResult = { key: RegisteredTargetKey; status: "RESOLVED" | "TARGET_NOT_FOUND" | "TARGET_AMBIGUOUS" };
export type AdapterHealthReport = { workflowKey: string; totalTargets: number; resolvedTargets: number; missingTargets: RegisteredTargetKey[]; healthy: boolean };

export function buildHealthReport(workflowKey: string, results: readonly TargetHealthResult[]): AdapterHealthReport {
  const expected = Object.entries(NUSUK_TARGETS).filter(([, definition]) => definition.workflows.includes(workflowKey as never)).map(([key]) => key as RegisteredTargetKey);
  const status = new Map(results.map((result) => [result.key, result.status]));
  const missingTargets = expected.filter((key) => status.get(key) !== "RESOLVED");
  return { workflowKey, totalTargets: expected.length, resolvedTargets: expected.length - missingTargets.length, missingTargets, healthy: missingTargets.length === 0 };
}
