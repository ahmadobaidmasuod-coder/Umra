import type { TenantContext } from "@shared/types";

declare global {
  namespace Express {
    interface User { id: string; }
    interface Request { ctx?: TenantContext; }
  }
}
export {};
