import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  status: text("status", { enum:["active", "suspended"] }).notNull().default("active"),
  plan: text("plan").notNull().default("foundation"),
  maxMembers: integer("max_members").notNull().default(25),
  locale: text("locale").notNull().default("ar-SA"),
  timeZone: text("time_zone").notNull().default("Asia/Riyadh"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_tenants_slug").on(table.slug)]);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  externalId: text("external_id").notNull(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  platformRole: text("platform_role").notNull().default("user"),
  status: text("status", { enum:["active", "suspended"] }).notNull().default("active"),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_users_external_id").on(table.externalId), index("idx_users_email").on(table.email)]);

export const tenantMemberships = sqliteTable("tenant_memberships", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete:"cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete:"cascade" }),
  role: text("role", { enum:["owner", "admin", "manager", "operator", "viewer"] }).notNull().default("operator"),
  status: text("status", { enum:["active", "suspended"] }).notNull().default("active"),
  joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_memberships_tenant_user").on(table.tenantId, table.userId), index("idx_memberships_tenant_status").on(table.tenantId, table.status), index("idx_memberships_user_status").on(table.userId, table.status)]);

export const tenantInvitations = sqliteTable("tenant_invitations", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete:"cascade" }),
  email: text("email").notNull(),
  role: text("role", { enum:["admin", "manager", "operator", "viewer"] }).notNull().default("operator"),
  token: text("token").notNull(),
  status: text("status", { enum:["pending", "accepted", "revoked", "expired"] }).notNull().default("pending"),
  expiresAt: text("expires_at").notNull(),
  invitedBy: text("invited_by").notNull().references(() => users.id),
  acceptedBy: text("accepted_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  acceptedAt: text("accepted_at"),
}, (table) => [uniqueIndex("idx_invitations_token").on(table.token), index("idx_invitations_tenant_status").on(table.tenantId, table.status), index("idx_invitations_email_status").on(table.email, table.status)]);

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete:"cascade" }),
  actorUserId: text("actor_user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_audit_tenant_created").on(table.tenantId, table.createdAt)]);
