const sensitiveKeys = new Set(["password", "passwordHash", "deviceToken", "host_id", "hostId", "national_address", "passportNumber", "passportNo"]);

export function redactPii(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactPii);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sensitiveKeys.has(key) ? "[REDACTED]" : redactPii(child)]));
  }
  return value;
}

export const safeLog = (event: string, data: unknown) => console.info(JSON.stringify({ event, data: redactPii(data), at: new Date().toISOString() }));
