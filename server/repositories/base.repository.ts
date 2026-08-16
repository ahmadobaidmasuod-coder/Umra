import { and, eq, isNull, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { TenantContext } from "@shared/types";

export type TenantScopedColumns = { tenantId: AnyPgColumn; deletedAt: AnyPgColumn };

export abstract class BaseRepository<T extends TenantScopedColumns> {
  protected constructor(protected readonly ctx: TenantContext, protected readonly table: T) {}
  protected scoped(...conditions: (SQL | undefined)[]): SQL {
    return and(eq(this.table.tenantId, this.ctx.tenantId), isNull(this.table.deletedAt), ...conditions)!;
  }
}
