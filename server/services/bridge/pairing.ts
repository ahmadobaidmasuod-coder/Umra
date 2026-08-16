import Redis from "ioredis";
import type { TenantContext } from "@shared/types";
import { BridgeDevicesRepository } from "@server/repositories/bridge-devices.repository";
import { createDeviceToken, createPairingCode, hashDeviceToken } from "./token";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", { lazyConnect: true, maxRetriesPerRequest: 1 });
const ensureRedis = async () => { if (redis.status === "wait") await redis.connect(); };

export async function issuePairingCode(ctx: TenantContext): Promise<{ code: string; expiresInSeconds: number }> {
  const code = createPairingCode();
  await ensureRedis();
  await redis.set(`pairing:${code}`, JSON.stringify(ctx), "EX", 300, "NX");
  return { code, expiresInSeconds: 300 };
}

export async function exchangePairingCode(code: string, extensionVersion: string): Promise<{ deviceToken: string }> {
  await ensureRedis();
  const key = `pairing:${code}`;
  const payload = await redis.get(key);
  if (!payload) throw new Error("PAIRING_CODE_INVALID");
  await redis.del(key);
  const ctx = JSON.parse(payload) as TenantContext;
  if (ctx.role !== "OPERATOR") throw new Error("OPERATOR_REQUIRED");
  const deviceToken = createDeviceToken();
  await new BridgeDevicesRepository(ctx).register(ctx.userId, hashDeviceToken(deviceToken), extensionVersion);
  return { deviceToken };
}
