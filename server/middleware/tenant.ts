import { and, eq, isNull } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { tenantUsers } from "@shared/schema";
import { db } from "@server/db";

declare module "express-session" { interface SessionData { activeTenantId?: string; } }

export async function resolveTenantContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  const tenantId = req.session.activeTenantId;
  const userId = req.user?.id;
  if (!tenantId || !userId) { res.status(403).json({ code: "TENANT_CONTEXT_REQUIRED" }); return; }
  try {
    const membership = await db.query.tenantUsers.findFirst({ where: and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId), eq(tenantUsers.status, "ACTIVE"), isNull(tenantUsers.deletedAt)) });
    if (!membership) { res.status(403).json({ code: "TENANT_MEMBERSHIP_REQUIRED" }); return; }
    req.ctx = { tenantId, userId, role: membership.role };
    next();
  } catch {
    // Fail closed: no tenant context is safer than a cross-tenant query.
    res.status(503).json({ code: "TENANT_CONTEXT_UNAVAILABLE" });
  }
}
