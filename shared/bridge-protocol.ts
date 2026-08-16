import { z } from "zod";

export const bridgeErrorCodeSchema = z.enum([
  "TARGET_NOT_FOUND",
  "TARGET_AMBIGUOUS",
  "TIMEOUT",
  "AUTH_LOST",
  "TAB_CLOSED",
  "NAVIGATION_UNEXPECTED",
  "ELEMENT_DISABLED",
  "UPLOAD_FAILED",
  "UNKNOWN",
]);
export type BridgeErrorCode = z.infer<typeof bridgeErrorCodeSchema>;

export const semanticTargetSchema = z.string().min(3).regex(/^[a-z][a-zA-Z0-9.]+$/);
export type SemanticTargetKey = z.infer<typeof semanticTargetSchema>;

export const bridgeActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("OPEN_URL"), url: z.string().url() }),
  z.object({ kind: z.literal("CLICK"), target: semanticTargetSchema }),
  z.object({ kind: z.literal("FILL"), target: semanticTargetSchema, value: z.string() }),
  z.object({ kind: z.literal("SELECT"), target: semanticTargetSchema, value: z.string() }),
  z.object({ kind: z.literal("READ"), target: semanticTargetSchema }),
  z.object({ kind: z.literal("WAIT_FOR"), target: semanticTargetSchema, timeoutMs: z.number().int().positive() }),
  z.object({ kind: z.literal("CHECK_EXISTS"), target: semanticTargetSchema }),
  z.object({ kind: z.literal("UPLOAD"), target: semanticTargetSchema, fileRef: z.string().min(1) }),
  z.object({ kind: z.literal("SCROLL_TO"), target: semanticTargetSchema }),
  z.object({ kind: z.literal("GET_PAGE_STATE") }),
]);
export type BridgeAction = z.infer<typeof bridgeActionSchema>;

export const bridgeEventSchema = z.discriminatedUnion("t", [
  z.object({ t: z.literal("HELLO"), deviceToken: z.string().min(32), extensionVersion: z.string().min(1) }),
  z.object({ t: z.literal("PING"), ts: z.number().int() }),
  z.object({ t: z.literal("TAB_BOUND"), tabId: z.number().int(), url: z.string().url() }),
  z.object({ t: z.literal("TAB_LOST"), tabId: z.number().int() }),
  z.object({ t: z.literal("NUSUK_CONNECTED"), detectedAt: z.number().int() }),
  z.object({ t: z.literal("NUSUK_AUTH_LOST"), reason: z.enum(["REDIRECT", "HTTP_401", "DOM_MARKER"]) }),
  z.object({ t: z.literal("STEP_RESULT"), runId: z.string(), stepIndex: z.number().int(), ok: z.literal(true), data: z.unknown(), durationMs: z.number().int().nonnegative() }),
  z.object({ t: z.literal("STEP_ERROR"), runId: z.string(), stepIndex: z.number().int(), ok: z.literal(false), code: bridgeErrorCodeSchema, detail: z.string().optional() }),
  z.object({ t: z.literal("PAGE_STATE"), url: z.string().url(), title: z.string(), markers: z.array(z.string()) }),
]);
export type BridgeEvent = z.infer<typeof bridgeEventSchema>;

export const bridgeCommandSchema = z.discriminatedUnion("t", [
  z.object({ t: z.literal("PONG"), ts: z.number().int() }),
  z.object({ t: z.literal("BIND_TAB"), url: z.string().url(), newWindow: z.literal(true) }),
  z.object({ t: z.literal("EXECUTE"), runId: z.string(), stepIndex: z.number().int(), action: bridgeActionSchema, timeoutMs: z.number().int().positive() }),
  z.object({ t: z.literal("ABORT"), runId: z.string(), reason: z.string() }),
  z.object({ t: z.literal("REVOKE"), reason: z.string() }),
]);
export type BridgeCommand = z.infer<typeof bridgeCommandSchema>;
