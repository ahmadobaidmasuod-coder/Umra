import { describe, expect, it } from "vitest";
import { sessionHealth } from "@server/services/bridge/session-health";

describe("session health", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");
  it.each([
    [20, "CONNECTED"], [45, "DEGRADED"], [89, "DEGRADED"], [90, "DISCONNECTED"],
  ] as const)("maps %ss silence to %s", (seconds, expected) => expect(sessionHealth(new Date(now.getTime() - seconds * 1000), now)).toBe(expected));
  it("treats a missing heartbeat as disconnected", () => expect(sessionHealth(null, now)).toBe("DISCONNECTED"));
});
