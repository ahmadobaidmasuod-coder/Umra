import { HttpError } from "./http.js";

let initialized = false;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS tenants (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'active', plan TEXT NOT NULL DEFAULT 'foundation', max_members INTEGER NOT NULL DEFAULT 25, locale TEXT NOT NULL DEFAULT 'ar-SA', time_zone TEXT NOT NULL DEFAULT 'Asia/Riyadh', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, external_id TEXT NOT NULL UNIQUE, email TEXT NOT NULL, display_name TEXT NOT NULL, platform_role TEXT NOT NULL DEFAULT 'user', status TEXT NOT NULL DEFAULT 'active', last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS tenant_memberships (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL DEFAULT 'operator', status TEXT NOT NULL DEFAULT 'active', joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(tenant_id, user_id))`,
  `CREATE TABLE IF NOT EXISTS tenant_invitations (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, email TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'operator', token TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'pending', expires_at TEXT NOT NULL, invited_by TEXT NOT NULL REFERENCES users(id), accepted_by TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, accepted_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, actor_user_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_tenant_user ON tenant_memberships(tenant_id, user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_memberships_tenant_status ON tenant_memberships(tenant_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_memberships_user_status ON tenant_memberships(user_id, status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token ON tenant_invitations(token)`,
  `CREATE INDEX IF NOT EXISTS idx_invitations_tenant_status ON tenant_invitations(tenant_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_invitations_email_status ON tenant_invitations(email, status)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON audit_logs(tenant_id, created_at)`,
];

export async function ensureSchema(db) {
  if (initialized) return;
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
  await db.prepare("PRAGMA optimize").run();
  initialized = true;
}

export async function all(db, sql, ...bindings) {
  const result = await db.prepare(sql).bind(...bindings).all();
  return result.results ?? [];
}

export function first(db, sql, ...bindings) { return db.prepare(sql).bind(...bindings).first(); }
export function run(db, sql, ...bindings) { return db.prepare(sql).bind(...bindings).run(); }

export async function ensureUser(db, identity) {
  let user = await first(db, "SELECT * FROM users WHERE external_id = ?", identity.externalId);
  if (!user) {
    user = { id:crypto.randomUUID(), external_id:identity.externalId, email:identity.email, display_name:identity.displayName, status:"active" };
    await run(db, "INSERT INTO users (id, external_id, email, display_name) VALUES (?, ?, ?, ?)", user.id, user.external_id, user.email, user.display_name);
  } else {
    await run(db, "UPDATE users SET email = ?, display_name = ?, last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", identity.email, identity.displayName, user.id);
    user = { ...user, email:identity.email, display_name:identity.displayName };
  }
  if (user.status !== "active") throw new HttpError(403, "حساب المستخدم معلّق.", "user_suspended");
  return user;
}

export function tenantContext(db, userId) {
  return first(db, `SELECT t.*, m.id AS membership_id, m.role, m.status AS membership_status FROM tenant_memberships m JOIN tenants t ON t.id = m.tenant_id WHERE m.user_id = ? AND m.status = 'active' AND t.status = 'active' ORDER BY m.created_at ASC LIMIT 1`, userId);
}

export function audit(db, tenantId, actorUserId, action, entityType, entityId = null, metadata = {}) {
  return run(db, "INSERT INTO audit_logs (id, tenant_id, actor_user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)", crypto.randomUUID(), tenantId, actorUserId, action, entityType, entityId, JSON.stringify(metadata));
}
