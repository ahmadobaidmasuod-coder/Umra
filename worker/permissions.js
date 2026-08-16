export const roles = ["owner", "admin", "manager", "operator", "viewer"];

const capabilities = {
  owner: new Set(["tenant:read", "tenant:update", "team:read", "team:invite", "team:update", "team:remove"]),
  admin: new Set(["tenant:read", "tenant:update", "team:read", "team:invite", "team:update", "team:remove"]),
  manager: new Set(["tenant:read", "team:read", "team:invite"]),
  operator: new Set(["tenant:read", "team:read"]),
  viewer: new Set(["tenant:read", "team:read"]),
};

export function can(role, capability) {
  return capabilities[role]?.has(capability) ?? false;
}

export function canManageRole(actorRole, targetRole, nextRole = targetRole) {
  if (targetRole === "owner" || nextRole === "owner") return false;
  if (actorRole === "owner") return true;
  if (actorRole !== "admin") return false;
  return targetRole !== "admin" && nextRole !== "admin";
}
