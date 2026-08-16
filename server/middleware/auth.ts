import type { NextFunction, Request, Response } from "express";

export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated?.() || !req.user) { res.status(401).json({ code: "UNAUTHENTICATED" }); return; }
  next();
}
