import type { NextFunction, Request, Response } from "express";
import type { TenantRole } from "@shared/types";

export const requireRole = (...roles: TenantRole[]) => (req: Request, res: Response, next: NextFunction): void => {
  if (!req.ctx || !roles.includes(req.ctx.role)) { res.status(403).json({ code: "ROLE_REQUIRED" }); return; }
  next();
};
