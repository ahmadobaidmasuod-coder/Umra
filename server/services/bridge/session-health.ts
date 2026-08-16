export type SessionHealth = "CONNECTED" | "DEGRADED" | "DISCONNECTED";
export function sessionHealth(lastHeartbeatAt: Date | null, now = new Date()): SessionHealth {
  if (!lastHeartbeatAt) return "DISCONNECTED";
  const silenceMs = now.getTime() - lastHeartbeatAt.getTime();
  if (silenceMs >= 90_000) return "DISCONNECTED";
  if (silenceMs >= 45_000) return "DEGRADED";
  return "CONNECTED";
}
