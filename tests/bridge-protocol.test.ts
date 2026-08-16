import { describe, expect, it } from "vitest";
import { bridgeCommandSchema, bridgeEventSchema } from "@shared/bridge-protocol";

describe("bridge protocol", () => {
  it("accepts a resolved primitive command", () => {
    expect(bridgeCommandSchema.parse({ t: "EXECUTE", runId: "run-1", stepIndex: 3, action: { kind: "FILL", target: "program.nameArabic", value: "برنامج النور" }, timeoutMs: 8_000 })).toMatchObject({ t: "EXECUTE" });
  });
  it("rejects tokens shorter than 32 characters", () => {
    expect(bridgeEventSchema.safeParse({ t: "HELLO", deviceToken: "short", extensionVersion: "0.1.0" }).success).toBe(false);
  });
});
