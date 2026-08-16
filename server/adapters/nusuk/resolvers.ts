import type { TargetStrategy } from "./registry";

export type ResolutionProbe = { strategy: TargetStrategy; count: number; visible: boolean; enabled: boolean };
export type TargetResolution =
  | { status: "RESOLVED"; strategy: TargetStrategy }
  | { status: "TARGET_NOT_FOUND" }
  | { status: "TARGET_AMBIGUOUS"; strategy: TargetStrategy; count: number };

export function resolveFromProbes(strategies: readonly TargetStrategy[], probes: readonly ResolutionProbe[]): TargetResolution {
  for (const strategy of strategies) {
    const probe = probes.find((candidate) => JSON.stringify(candidate.strategy) === JSON.stringify(strategy));
    if (!probe || probe.count === 0 || !probe.visible || !probe.enabled) continue;
    if (probe.count > 1) return { status: "TARGET_AMBIGUOUS", strategy, count: probe.count };
    return { status: "RESOLVED", strategy };
  }
  return { status: "TARGET_NOT_FOUND" };
}
