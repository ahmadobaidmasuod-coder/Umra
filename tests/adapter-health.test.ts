import { describe, expect, it } from "vitest";
import { buildHealthReport } from "@server/adapters/nusuk/health";
import { resolveFromProbes } from "@server/adapters/nusuk/resolvers";

describe("semantic adapter", () => {
  it("uses the first strategy that resolves exactly one usable element", () => {
    const strategies = [{ by: "label", value: "اسم البرنامج" }, { by: "css", value: "#programNameAr" }] as const;
    expect(resolveFromProbes(strategies, [{ strategy: strategies[0], count: 0, visible: true, enabled: true }, { strategy: strategies[1], count: 1, visible: true, enabled: true }])).toEqual({ status: "RESOLVED", strategy: strategies[1] });
  });
  it("fails loudly on ambiguity", () => {
    const strategy = { by: "css", value: "button[type=submit]" } as const;
    expect(resolveFromProbes([strategy], [{ strategy, count: 2, visible: true, enabled: true }]).status).toBe("TARGET_AMBIGUOUS");
  });
  it("marks the workflow unhealthy when a required target is missing", () => {
    const report = buildHealthReport("CREATE_UMRAH_PROGRAM", [
      { key: "program.nameArabic", status: "RESOLVED" },
      { key: "program.nameEnglish", status: "RESOLVED" },
      { key: "program.submitButton", status: "TARGET_NOT_FOUND" },
      { key: "program.searchResultByName", status: "RESOLVED" },
    ]);
    expect(report.healthy).toBe(false);
    expect(report.missingTargets).toContain("program.submitButton");
  });
});
