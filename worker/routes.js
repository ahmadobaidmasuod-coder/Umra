import { requireIdentity } from "./auth.js";
import { all, audit, ensureSchema, ensureUser, first, run, tenantContext } from "./db.js";
import { HttpError, json, readJson } from "./http.js";
import { can, canManageRole } from "./permissions.js";

const assignableRoles = new Set(["admin", "manager", "operator", "viewer"]);
const editableLocales = new Set(["ar-SA", "en-US"]);
const editableTimeZones = new Set(["Asia/Riyadh", "Asia/Dubai", "UTC"]);

function assertCapability(context, capability) {
  if (!can(context.role, capability)) throw new HttpError(403, "ليست لديك الصلاحية لتنفيذ هذا الإجراء.", "forbidden");
}

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeEmail(value) {
  const email = cleanText(value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "أدخل بريدًا إلكترونيًا صحيحًا.", "invalid_email");
  return email;
}

function slugFor(name) {
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "tenant";
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

function publicTenant(row) {
  return { id:row.id, name:row.name, slug:row.slug, status:row.status, plan:row.plan, maxMembers:row.max_members, locale:row.locale, timeZone:row.time_zone, createdAt:row.created_at };
}

function publicUser(row) {
  return { id:row.user_id ?? row.id, membershipId:row.membership_id, email:row.email, displayName:row.display_name, role:row.role, status:row.membership_status ?? row.status, joinedAt:row.joined_at, lastSeenAt:row.last_seen_at };
}

async function getMembers(db, tenantId) {
  const rows = await all(db, `SELECT u.id AS user_id, u.email, u.display_name, u.last_seen_at, m.id AS membership_id, m.role, m.status AS membership_status, m.joined_at FROM tenant_memberships m JOIN users u ON u.id = m.user_id WHERE m.tenant_id = ? ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END, u.display_name`, tenantId);
  return rows.map(publicUser);
}

async function getInvitations(db, tenantId) {
  const rows = await all(db, `SELECT id, email, role, token, status, expires_at, created_at FROM tenant_invitations WHERE tenant_id = ? AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC`, tenantId);
  return rows.map((row) => ({ id:row.id, email:row.email, role:row.role, status:row.status, expiresAt:row.expires_at, createdAt:row.created_at, invitePath:`/invite/${row.token}` }));
}

async function bootstrap(db, user) {
  const context = await tenantContext(db, user.id);
  if (!context) return { user:{ id:user.id, email:user.email, displayName:user.display_name }, needsOnboarding:true };

  const members = await getMembers(db, context.id);
  const invitations = await getInvitations(db, context.id);
  return {
    user:{ id:user.id, email:user.email, displayName:user.display_name },
    needsOnboarding:false,
    tenant:publicTenant(context),
    membership:{ id:context.membership_id, role:context.role },
    permissions:{ canManageTenant:can(context.role, "tenant:update"), canInvite:can(context.role, "team:invite"), canManageTeam:can(context.role, "team:update") },
    stats:{ members:members.length, activeMembers:members.filter((member) => member.status === "active").length, admins:members.filter((member) => ["owner", "admin"].includes(member.role)).length, pendingInvitations:invitations.length },
    recentMembers:members.slice(0, 5),
  };
}

async function getInvitation(db, token) {
  const invitation = await first(db, `SELECT i.*, t.name AS tenant_name, t.status AS tenant_status FROM tenant_invitations i JOIN tenants t ON t.id = i.tenant_id WHERE i.token = ?`, token);
  if (!invitation || invitation.status !== "pending") throw new HttpError(404, "الدعوة غير موجودة أو لم تعد صالحة.", "invitation_not_found");
  if (invitation.expires_at <= new Date().toISOString()) throw new HttpError(410, "انتهت صلاحية هذه الدعوة.", "invitation_expired");
  if (invitation.tenant_status !== "active") throw new HttpError(403, "مساحة الشركة غير متاحة حاليًا.", "tenant_unavailable");
  return invitation;
}

export async function routeApi(request, env) {
  const db = env.DB;
  if (!db) throw new HttpError(503, "قاعدة البيانات غير متاحة.", "database_unavailable");
  await ensureSchema(db);

  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);

  if (parts[1] === "invitations" && parts[2] && request.method === "GET") {
    const invitation = await getInvitation(db, parts[2]);
    return json({ invitation:{ tenantName:invitation.tenant_name, email:invitation.email, role:invitation.role, expiresAt:invitation.expires_at } });
  }

  const identity = requireIdentity(request);
  const user = await ensureUser(db, identity);

  if (url.pathname === "/api/bootstrap" && request.method === "GET") return json(await bootstrap(db, user));

  if (url.pathname === "/api/tenants" && request.method === "POST") {
    const existing = await tenantContext(db, user.id);
    if (existing) throw new HttpError(409, "لديك مساحة شركة بالفعل.", "tenant_exists");
    const body = await readJson(request);
    const name = cleanText(body.name, 100);
    if (name.length < 2) throw new HttpError(400, "اسم الشركة مطلوب.", "invalid_tenant_name");

    const tenantId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();
    await db.batch([
      db.prepare("INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)").bind(tenantId, name, slugFor(name)),
      db.prepare("INSERT INTO tenant_memberships (id, tenant_id, user_id, role) VALUES (?, ?, ?, 'owner')").bind(membershipId, tenantId, user.id),
      db.prepare("INSERT INTO audit_logs (id, tenant_id, actor_user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, 'tenant.created', 'tenant', ?, ?)").bind(crypto.randomUUID(), tenantId, user.id, tenantId, JSON.stringify({ name })),
    ]);
    return json(await bootstrap(db, user), 201);
  }

  if (parts[1] === "invitations" && parts[2] && request.method === "POST") {
    const invitation = await getInvitation(db, parts[2]);
    if (identity.email !== invitation.email.toLowerCase()) throw new HttpError(403, "سجّل الدخول بالبريد الذي استلم الدعوة.", "email_mismatch");
    const activeMembership = await first(db, "SELECT tenant_id FROM tenant_memberships WHERE user_id = ? AND status = 'active' LIMIT 1", user.id);
    if (activeMembership && activeMembership.tenant_id !== invitation.tenant_id) throw new HttpError(409, "هذا الحساب مرتبط بشركة أخرى.", "user_has_tenant");
    const existing = await first(db, "SELECT id FROM tenant_memberships WHERE tenant_id = ? AND user_id = ?", invitation.tenant_id, user.id);
    if (existing) throw new HttpError(409, "أنت عضو في هذه الشركة بالفعل.", "already_member");

    const membershipId = crypto.randomUUID();
    await db.batch([
      db.prepare("INSERT INTO tenant_memberships (id, tenant_id, user_id, role) VALUES (?, ?, ?, ?)").bind(membershipId, invitation.tenant_id, user.id, invitation.role),
      db.prepare("UPDATE tenant_invitations SET status = 'accepted', accepted_by = ?, accepted_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'").bind(user.id, invitation.id),
      db.prepare("INSERT INTO audit_logs (id, tenant_id, actor_user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, 'invitation.accepted', 'membership', ?, ?)").bind(crypto.randomUUID(), invitation.tenant_id, user.id, membershipId, JSON.stringify({ role:invitation.role })),
    ]);
    return json({ ok:true, tenantName:invitation.tenant_name });
  }

  const context = await tenantContext(db, user.id);
  if (!context) throw new HttpError(403, "أنشئ مساحة شركة أولًا.", "onboarding_required");

  if (url.pathname === "/api/tenant" && request.method === "GET") return json({ tenant:publicTenant(context), membership:{ role:context.role } });

  if (url.pathname === "/api/tenant" && request.method === "PATCH") {
    assertCapability(context, "tenant:update");
    const body = await readJson(request);
    const name = cleanText(body.name, 100);
    const locale = editableLocales.has(body.locale) ? body.locale : context.locale;
    const timeZone = editableTimeZones.has(body.timeZone) ? body.timeZone : context.time_zone;
    if (name.length < 2) throw new HttpError(400, "اسم الشركة مطلوب.", "invalid_tenant_name");
    await run(db, "UPDATE tenants SET name = ?, locale = ?, time_zone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", name, locale, timeZone, context.id);
    await audit(db, context.id, user.id, "tenant.updated", "tenant", context.id, { name, locale, timeZone });
    const updated = await first(db, "SELECT * FROM tenants WHERE id = ?", context.id);
    return json({ tenant:publicTenant(updated) });
  }

  if (url.pathname === "/api/team" && request.method === "GET") {
    assertCapability(context, "team:read");
    return json({ members:await getMembers(db, context.id), invitations:await getInvitations(db, context.id), membership:{ role:context.role }, permissions:{ canInvite:can(context.role, "team:invite"), canManageTeam:can(context.role, "team:update") } });
  }

  if (url.pathname === "/api/team" && request.method === "POST") {
    assertCapability(context, "team:invite");
    const body = await readJson(request);
    const email = normalizeEmail(body.email);
    const role = assignableRoles.has(body.role) ? body.role : "operator";
    if (context.role === "manager" && !["operator", "viewer"].includes(role)) throw new HttpError(403, "يمكن للمشرف دعوة موظف أو مشاهد فقط.", "role_not_allowed");

    const memberCount = await first(db, "SELECT COUNT(*) AS total FROM tenant_memberships WHERE tenant_id = ? AND status = 'active'", context.id);
    if (Number(memberCount.total) >= Number(context.max_members)) throw new HttpError(409, "وصلت الشركة إلى الحد الأقصى من المستخدمين.", "member_limit_reached");
    const member = await first(db, `SELECT m.id FROM tenant_memberships m JOIN users u ON u.id = m.user_id WHERE m.tenant_id = ? AND lower(u.email) = ?`, context.id, email);
    if (member) throw new HttpError(409, "هذا المستخدم عضو في الشركة بالفعل.", "already_member");

    await run(db, "UPDATE tenant_invitations SET status = 'revoked' WHERE tenant_id = ? AND lower(email) = ? AND status = 'pending'", context.id, email);
    const invitation = { id:crypto.randomUUID(), token:crypto.randomUUID(), expiresAt:new Date(Date.now() + 7 * 86400000).toISOString() };
    await run(db, "INSERT INTO tenant_invitations (id, tenant_id, email, role, token, expires_at, invited_by) VALUES (?, ?, ?, ?, ?, ?, ?)", invitation.id, context.id, email, role, invitation.token, invitation.expiresAt, user.id);
    await audit(db, context.id, user.id, "invitation.created", "invitation", invitation.id, { email, role });
    return json({ invitation:{ id:invitation.id, email, role, status:"pending", expiresAt:invitation.expiresAt, invitePath:`/invite/${invitation.token}` } }, 201);
  }

  if (parts[1] === "team" && parts[2]) {
    assertCapability(context, request.method === "DELETE" ? "team:remove" : "team:update");
    const target = await first(db, `SELECT m.*, u.email, u.display_name FROM tenant_memberships m JOIN users u ON u.id = m.user_id WHERE m.id = ? AND m.tenant_id = ?`, parts[2], context.id);
    if (!target) throw new HttpError(404, "المستخدم غير موجود.", "member_not_found");
    if (target.user_id === user.id) throw new HttpError(400, "لا يمكنك تعليق حسابك بنفسك.", "self_change_blocked");

    if (request.method === "PATCH") {
      const body = await readJson(request);
      const nextRole = assignableRoles.has(body.role) ? body.role : target.role;
      const nextStatus = ["active", "suspended"].includes(body.status) ? body.status : target.status;
      if (!canManageRole(context.role, target.role, nextRole)) throw new HttpError(403, "لا يمكنك تعديل هذا الدور.", "role_change_forbidden");
      await run(db, "UPDATE tenant_memberships SET role = ?, status = ? WHERE id = ?", nextRole, nextStatus, target.id);
      await audit(db, context.id, user.id, "membership.updated", "membership", target.id, { role:nextRole, status:nextStatus });
      return json({ member:{ ...publicUser({ ...target, role:nextRole, membership_status:nextStatus }), role:nextRole, status:nextStatus } });
    }

    if (request.method === "DELETE") {
      if (!canManageRole(context.role, target.role)) throw new HttpError(403, "لا يمكنك تعليق هذا المستخدم.", "member_remove_forbidden");
      await run(db, "UPDATE tenant_memberships SET status = 'suspended' WHERE id = ?", target.id);
      await audit(db, context.id, user.id, "membership.suspended", "membership", target.id, { email:target.email });
      return json({ ok:true });
    }
  }

  if (parts[1] === "invitations" && parts[2] && request.method === "DELETE") {
    assertCapability(context, "team:invite");
    const invitation = await first(db, "SELECT id FROM tenant_invitations WHERE id = ? AND tenant_id = ? AND status = 'pending'", parts[2], context.id);
    if (!invitation) throw new HttpError(404, "الدعوة غير موجودة.", "invitation_not_found");
    await run(db, "UPDATE tenant_invitations SET status = 'revoked' WHERE id = ?", invitation.id);
    await audit(db, context.id, user.id, "invitation.revoked", "invitation", invitation.id);
    return json({ ok:true });
  }

  throw new HttpError(404, "المسار غير موجود.", "not_found");
}
