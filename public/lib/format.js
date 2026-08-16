export const roleLabels = { owner:"مالك", admin:"مدير", manager:"مشرف", operator:"موظف", viewer:"مشاهد" };

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]);
}

export function initials(name = "") {
  const letters = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
  return escapeHtml(letters || "م");
}

export function dateLabel(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA", { year:"numeric", month:"short", day:"numeric" }).format(new Date(value));
}

export function roleOptions(selected, actorRole) {
  const allowed = actorRole === "owner" ? ["admin", "manager", "operator", "viewer"] : ["manager", "operator", "viewer"];
  return allowed.map((role) => `<option value="${role}" ${selected === role ? "selected" : ""}>${roleLabels[role]}</option>`).join("");
}
