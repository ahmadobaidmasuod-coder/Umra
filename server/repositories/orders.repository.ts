import { eq } from "drizzle-orm";
import { orders } from "@shared/schema";
import type { TenantContext } from "@shared/types";
import { db } from "@server/db";
import { BaseRepository } from "./base.repository";

export class OrdersRepository extends BaseRepository<typeof orders> {
  constructor(ctx: TenantContext) { super(ctx, orders); }
  async findById(id: string) { return db.query.orders.findFirst({ where: this.scoped(eq(orders.id, id)) }); }
  async list() { return db.query.orders.findMany({ where: this.scoped(), orderBy: (table, { desc }) => [desc(table.createdAt)] }); }
  async softDelete(id: string) { return db.update(orders).set({ deletedAt: new Date(), updatedAt: new Date() }).where(this.scoped(eq(orders.id, id))).returning({ id: orders.id }); }
}
