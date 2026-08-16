import { and, eq, isNull } from "drizzle-orm";
import { bridgeDevices } from "@shared/schema";
import type { TenantContext } from "@shared/types";
import { db } from "@server/db";
import { BaseRepository } from "./base.repository";

export class BridgeDevicesRepository extends BaseRepository<typeof bridgeDevices> {
  constructor(ctx: TenantContext) { super(ctx, bridgeDevices); }
  async register(userId: string, deviceTokenHash: string, extensionVersion: string) {
    return db.insert(bridgeDevices).values({ tenantId: this.ctx.tenantId, userId, deviceTokenHash, extensionVersion }).returning({ id: bridgeDevices.id });
  }
  async revoke(id: string) { return db.update(bridgeDevices).set({ status: "REVOKED", updatedAt: new Date() }).where(this.scoped(eq(bridgeDevices.id, id))).returning({ id: bridgeDevices.id }); }
}

// Authentication happens before a TenantContext exists. The token hash is globally unique;
// this repository returns the tenant identity and never accepts a caller-supplied tenantId.
export class DeviceAuthenticationRepository {
  async resolveByTokenHash(deviceTokenHash: string) {
    return db.query.bridgeDevices.findFirst({ where: and(eq(bridgeDevices.deviceTokenHash, deviceTokenHash), eq(bridgeDevices.status, "ACTIVE"), isNull(bridgeDevices.deletedAt)), columns: { id: true, tenantId: true, userId: true } });
  }
}
