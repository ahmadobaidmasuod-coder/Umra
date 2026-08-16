import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { orders, tenants, tenantUsers, users } from "./schema";

export const TENANT_ROLES = ["TENANT_ADMIN", "OPERATOR", "VIEWER"] as const;
export const PLATFORM_ROLES = ["SUPER_ADMIN"] as const;
export type TenantRole = (typeof TENANT_ROLES)[number];
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export type TenantContext = {
  tenantId: string;
  userId: string;
  role: TenantRole;
};

export type Tenant = InferSelectModel<typeof tenants>;
export type NewTenant = InferInsertModel<typeof tenants>;
export type User = InferSelectModel<typeof users>;
export type TenantUser = InferSelectModel<typeof tenantUsers>;
export type Order = InferSelectModel<typeof orders>;

export type ResolutionMode = "FIXED" | "RULE" | "INSTRUCTION";
export type RuleOperator = "EQ" | "NEQ" | "GT" | "GTE" | "LT" | "LTE" | "IN";
export type Rule = {
  field: string;
  operator: RuleOperator;
  value: string | number | readonly (string | number)[];
  result: string | number;
};
export type ConfigValue =
  | { mode: "FIXED"; value: string | number }
  | { mode: "RULE"; rules: Rule[]; fallback?: string | number }
  | { mode: "INSTRUCTION"; instruction: string };

export type ResolutionResult =
  | { status: "RESOLVED"; value: string | number }
  | { status: "NEEDS_DECISION"; instruction: string };
