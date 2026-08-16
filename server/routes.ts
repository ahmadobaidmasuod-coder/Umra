import { Router } from "express";
import { getHealth } from "./controllers/health.controller";
import { isAuthenticated } from "./middleware/auth";
import { resolveTenantContext } from "./middleware/tenant";
import { requireRole } from "./middleware/rbac";
import { createPairingCode, pairDevice } from "./controllers/bridge.controller";

export const routes = Router();
routes.get("/health", getHealth);
routes.post("/bridge/pair", pairDevice);
routes.use("/tenant", isAuthenticated, resolveTenantContext);
routes.get("/tenant/session", (req, res) => res.json({ tenantId: req.ctx!.tenantId, role: req.ctx!.role, nusuk: { status: "DISCONNECTED" } }));
routes.post("/tenant/bridge/pairing-code", requireRole("OPERATOR"), createPairingCode);
