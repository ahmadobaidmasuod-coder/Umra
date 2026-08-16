import { relations, sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

const id = () => varchar("id").primaryKey().default(sql`gen_random_uuid()`);
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};
const tenantId = () => varchar("tenant_id").notNull().references(() => tenants.id);

export const tenantStatus = pgEnum("tenant_status", ["ACTIVE", "SUSPENDED"]);
export const membershipStatus = pgEnum("membership_status", ["INVITED", "ACTIVE", "SUSPENDED"]);
export const tenantRole = pgEnum("tenant_role", ["TENANT_ADMIN", "OPERATOR", "VIEWER"]);
export const orderStatus = pgEnum("order_status", ["DRAFT", "QUEUED", "ASSIGNED", "RUNNING", "COMPLETED", "COMPLETED_MANUAL", "PARTIALLY_COMPLETED", "NEEDS_DECISION", "NEEDS_RECOVERY", "NEEDS_HUMAN_VERIFICATION", "PAUSED_AUTH", "FAILED", "CANCELLED"]);
export const actorType = pgEnum("actor_type", ["SYSTEM", "USER", "BRIDGE"]);
export const runStatus = pgEnum("run_status", ["QUEUED", "RUNNING", "COMPLETED", "NEEDS_DECISION", "NEEDS_RECOVERY", "NEEDS_HUMAN_VERIFICATION", "PAUSED_AUTH", "FAILED", "CANCELLED"]);
export const stepStatus = pgEnum("step_status", ["PENDING", "RUNNING", "COMPLETED", "SKIPPED", "NEEDS_DECISION", "NEEDS_RECOVERY", "NEEDS_HUMAN_VERIFICATION", "FAILED"]);
export const nusukSessionStatus = pgEnum("nusuk_session_status", ["CONNECTED", "DEGRADED", "DISCONNECTED", "BUSY"]);

export const tenants = pgTable("tenants", {
  id: id(),
  name: varchar("name", { length: 200 }).notNull(),
  commercialRegNo: varchar("commercial_reg_no", { length: 32 }).notNull(),
  nusukLicenseNo: varchar("nusuk_license_no", { length: 64 }),
  status: tenantStatus().notNull().default("ACTIVE"),
  subscriptionPlan: varchar("subscription_plan", { length: 64 }).notNull().default("FOUNDATION"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Riyadh"),
  ...timestamps,
}, (table) => [uniqueIndex("tenants_cr_unique").on(table.commercialRegNo)]);

export const users = pgTable("users", {
  id: id(),
  email: varchar("email", { length: 320 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  platformRole: varchar("platform_role", { length: 32 }),
  ...timestamps,
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const tenantUsers = pgTable("tenant_users", {
  id: id(), tenantId: tenantId(), userId: varchar("user_id").notNull().references(() => users.id),
  role: tenantRole().notNull(), status: membershipStatus().notNull().default("INVITED"),
  invitedBy: varchar("invited_by").references(() => users.id), activatedAt: timestamp("activated_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [uniqueIndex("tenant_users_membership_unique").on(table.tenantId, table.userId), index("tenant_users_lookup_idx").on(table.userId, table.status)]);

export const externalAgents = pgTable("external_agents", {
  id: id(), tenantId: tenantId(), name: varchar("name", { length: 200 }).notNull(), country: varchar("country", { length: 2 }).notNull(),
  contactEmail: varchar("contact_email", { length: 320 }), defaultFormId: varchar("default_form_id"), isActive: boolean("is_active").notNull().default(true), ...timestamps,
});

export const commandCenterVersions = pgTable("command_center_versions", {
  id: id(), tenantId: tenantId(), version: integer("version").notNull(), payload: jsonb("payload").notNull(),
  publishedBy: varchar("published_by").notNull().references(() => users.id), publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(true), ...timestamps,
}, (table) => [uniqueIndex("cc_tenant_version_unique").on(table.tenantId, table.version)]);

export const forms = pgTable("forms", {
  id: id(), tenantId: tenantId(), key: varchar("key", { length: 100 }).notNull(), titleAr: varchar("title_ar", { length: 200 }).notNull(), titleEn: varchar("title_en", { length: 200 }).notNull(),
  schema: jsonb("schema").notNull(), targetWorkflowKey: varchar("target_workflow_key", { length: 100 }).notNull(), isActive: boolean("is_active").notNull().default(true), ...timestamps,
}, (table) => [uniqueIndex("forms_tenant_key_unique").on(table.tenantId, table.key)]);

export const formLinks = pgTable("form_links", {
  id: id(), tenantId: tenantId(), formId: varchar("form_id").notNull().references(() => forms.id), externalAgentId: varchar("external_agent_id").references(() => externalAgents.id),
  token: varchar("token", { length: 128 }).notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }), maxSubmissions: integer("max_submissions"), submissionCount: integer("submission_count").notNull().default(0), ...timestamps,
}, (table) => [uniqueIndex("form_links_token_unique").on(table.token)]);

export const orders = pgTable("orders", {
  id: id(), tenantId: tenantId(), orderNumber: integer("order_number").notNull(), source: varchar("source", { length: 16 }).notNull(), workflowKey: varchar("workflow_key", { length: 100 }).notNull(),
  priority: integer("priority").notNull(), status: orderStatus().notNull().default("DRAFT"), payload: jsonb("payload").notNull(), commandCenterVersion: integer("command_center_version").notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 64 }).notNull(), assignedUserId: varchar("assigned_user_id").references(() => users.id), assignedAt: timestamp("assigned_at", { withTimezone: true }),
  nusukReference: varchar("nusuk_reference", { length: 200 }), createdByUserId: varchar("created_by_user_id").references(() => users.id), ...timestamps,
}, (table) => [uniqueIndex("orders_tenant_idempotency_unique").on(table.tenantId, table.idempotencyKey), uniqueIndex("orders_number_unique").on(table.tenantId, table.orderNumber), index("orders_dispatch_idx").on(table.tenantId, table.status, table.priority, table.createdAt)]);

export const formSubmissions = pgTable("form_submissions", {
  id: id(), tenantId: tenantId(), formId: varchar("form_id").notNull().references(() => forms.id), formLinkId: varchar("form_link_id").references(() => formLinks.id),
  rawPayload: jsonb("raw_payload").notNull(), normalizedPayload: jsonb("normalized_payload").notNull(), attachments: jsonb("attachments").notNull().default([]),
  submitterIp: varchar("submitter_ip", { length: 64 }), orderId: varchar("order_id").references(() => orders.id), ...timestamps,
});

export const orderEvents = pgTable("order_events", {
  id: id(), tenantId: tenantId(), orderId: varchar("order_id").notNull().references(() => orders.id), eventType: varchar("event_type", { length: 100 }).notNull(),
  actorType: actorType().notNull(), actorId: varchar("actor_id"), payload: jsonb("payload").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("order_events_order_idx").on(table.tenantId, table.orderId, table.createdAt)]);

export const orderItems = pgTable("order_items", {
  id: id(), tenantId: tenantId(), orderId: varchar("order_id").notNull().references(() => orders.id), itemIndex: integer("item_index").notNull(), payload: jsonb("payload").notNull(),
  status: varchar("status", { length: 32 }).notNull(), idempotencyKey: varchar("idempotency_key", { length: 64 }).notNull(), nusukReference: varchar("nusuk_reference", { length: 200 }), attempts: integer("attempts").notNull().default(0), ...timestamps,
}, (table) => [uniqueIndex("order_items_idempotency_unique").on(table.tenantId, table.idempotencyKey)]);

export const workflowDefinitions = pgTable("workflow_definitions", {
  id: id(), key: varchar("key", { length: 100 }).notNull(), version: integer("version").notNull(), name: varchar("name", { length: 200 }).notNull(),
  kind: varchar("kind", { length: 32 }).notNull(), definition: jsonb("definition").notNull(), isActive: boolean("is_active").notNull().default(true), ...timestamps,
}, (table) => [uniqueIndex("workflow_definition_unique").on(table.key, table.version)]);

export const workflowRuns = pgTable("workflow_runs", {
  id: id(), tenantId: tenantId(), orderId: varchar("order_id").references(() => orders.id), workflowKey: varchar("workflow_key", { length: 100 }).notNull(), workflowVersion: integer("workflow_version").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id), status: runStatus().notNull(), currentStepIndex: integer("current_step_index").notNull().default(0), lastCheckpointIndex: integer("last_checkpoint_index").notNull().default(0),
  context: jsonb("context").notNull().default({}), startedAt: timestamp("started_at", { withTimezone: true }), finishedAt: timestamp("finished_at", { withTimezone: true }), failureReason: text("failure_reason"), ...timestamps,
});

export const workflowStepRuns = pgTable("workflow_step_runs", {
  id: id(), tenantId: tenantId(), runId: varchar("run_id").notNull().references(() => workflowRuns.id), stepIndex: integer("step_index").notNull(), stepKey: varchar("step_key", { length: 100 }).notNull(),
  status: stepStatus().notNull(), attempts: integer("attempts").notNull().default(0), request: jsonb("request"), response: jsonb("response"), errorCode: varchar("error_code", { length: 64 }), durationMs: integer("duration_ms"),
  startedAt: timestamp("started_at", { withTimezone: true }), finishedAt: timestamp("finished_at", { withTimezone: true }), ...timestamps,
});

export const workflowCheckpoints = pgTable("workflow_checkpoints", {
  id: id(), tenantId: tenantId(), runId: varchar("run_id").notNull().references(() => workflowRuns.id), stepIndex: integer("step_index").notNull(), nusukState: jsonb("nusuk_state").notNull(), ...timestamps,
});

export const bridgeDevices = pgTable("bridge_devices", {
  id: id(), tenantId: tenantId(), userId: varchar("user_id").notNull().references(() => users.id), deviceTokenHash: varchar("device_token_hash", { length: 64 }).notNull(), extensionVersion: varchar("extension_version", { length: 32 }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }), status: varchar("status", { length: 32 }).notNull().default("ACTIVE"), ...timestamps,
}, (table) => [uniqueIndex("bridge_token_hash_unique").on(table.deviceTokenHash)]);

export const nusukSessions = pgTable("nusuk_sessions", {
  id: id(), tenantId: tenantId(), userId: varchar("user_id").notNull().references(() => users.id), status: nusukSessionStatus().notNull().default("DISCONNECTED"),
  boundTabId: integer("bound_tab_id"), lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }), disconnectedAt: timestamp("disconnected_at", { withTimezone: true }), currentRunId: varchar("current_run_id"), ...timestamps,
}, (table) => [uniqueIndex("nusuk_session_user_unique").on(table.tenantId, table.userId)]);

export const adapterHealthChecks = pgTable("adapter_health_checks", {
  id: id(), tenantId: tenantId(), workflowKey: varchar("workflow_key", { length: 100 }).notNull(), totalTargets: integer("total_targets").notNull(), resolvedTargets: integer("resolved_targets").notNull(),
  missingTargets: jsonb("missing_targets").notNull().default([]), checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(), ...timestamps,
});

export const auditLogs = pgTable("audit_logs", {
  id: id(), tenantId: tenantId(), userId: varchar("user_id").references(() => users.id), action: varchar("action", { length: 100 }).notNull(), entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: varchar("entity_id"), before: jsonb("before"), after: jsonb("after"), ip: varchar("ip", { length: 64 }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), deletedAt: timestamp("deleted_at", { withTimezone: true }), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const manualInterventions = pgTable("manual_interventions", {
  id: id(), tenantId: tenantId(), orderId: varchar("order_id").notNull().references(() => orders.id), runId: varchar("run_id").references(() => workflowRuns.id), stepIndex: integer("step_index"),
  reason: text("reason").notNull(), assignedUserId: varchar("assigned_user_id").references(() => users.id), resolvedAt: timestamp("resolved_at", { withTimezone: true }), resolution: varchar("resolution", { length: 32 }), nusukReference: varchar("nusuk_reference", { length: 200 }), notes: text("notes"), ...timestamps,
});

export const idempotencyRecords = pgTable("idempotency_records", {
  id: id(), tenantId: tenantId(), key: varchar("key", { length: 64 }).notNull(), scope: varchar("scope", { length: 64 }).notNull(), resourceId: varchar("resource_id").notNull(), response: jsonb("response"), ...timestamps,
}, (table) => [uniqueIndex("idempotency_scope_unique").on(table.tenantId, table.scope, table.key)]);

export const tenantRelations = relations(tenants, ({ many }) => ({ memberships: many(tenantUsers), orders: many(orders) }));
export const userRelations = relations(users, ({ many }) => ({ memberships: many(tenantUsers) }));
export const orderRelations = relations(orders, ({ many }) => ({ events: many(orderEvents), items: many(orderItems), runs: many(workflowRuns) }));
