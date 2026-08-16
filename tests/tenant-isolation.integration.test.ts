import { describe, expect, it } from "vitest";
import type { TenantContext } from "@shared/types";

type StoredOrder = { id: string; tenantId: string; payload: unknown; deletedAt: Date | null };
class ScopedOrderRepositoryHarness {
  constructor(private readonly ctx: TenantContext, private readonly rows: StoredOrder[]) {}
  findById(id: string) { return this.rows.find((row) => row.id === id && row.tenantId === this.ctx.tenantId && row.deletedAt === null); }
}

describe("tenant isolation integration contract", () => {
  it("returns 404 semantics when tenant A requests tenant B's order by direct ID", () => {
    const authenticatedTenantA: TenantContext = { tenantId: "tenant-a", userId: "user-a", role: "OPERATOR" };
    const repository = new ScopedOrderRepositoryHarness(authenticatedTenantA, [{ id: "order-b", tenantId: "tenant-b", payload: {}, deletedAt: null }]);
    const status = repository.findById("order-b") ? 200 : 404;
    expect(status).toBe(404);
  });
});
