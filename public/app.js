import { api, body } from "./lib/api.js";
import { companyView, dashboardView, errorView, inviteView, landingView, loadingView, onboardingView, shellView, signInRequiredView, teamView } from "./views.js";

const app = document.querySelector("#app");
let bootstrapData = null;
let teamData = null;

function toast(message, tone = "success") {
  document.querySelector(".toast")?.remove();
  const element = document.createElement("div");
  element.className = `toast ${tone}`;
  element.textContent = message;
  document.body.append(element);
  setTimeout(() => element.remove(), 3200);
}

function navigate(path) {
  history.pushState({}, "", path);
  render();
}

async function loadBootstrap() {
  bootstrapData = await api("/api/bootstrap");
  return bootstrapData;
}

async function render() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  app.innerHTML = loadingView();

  if (path === "/") {
    app.innerHTML = landingView();
    return;
  }

  if (path.startsWith("/invite/")) {
    const token = path.split("/")[2];
    try {
      const [{ invitation }, session] = await Promise.all([api(`/api/invitations/${token}`), api("/api/bootstrap").catch(() => null)]);
      app.innerHTML = inviteView(invitation, Boolean(session));
    } catch (error) { app.innerHTML = errorView(error.message); }
    return;
  }

  try {
    const data = await loadBootstrap();
    if (data.needsOnboarding) {
      app.innerHTML = onboardingView(data.user);
      return;
    }

    if (path === "/dashboard/team") {
      teamData = await api("/api/team");
      app.innerHTML = shellView(teamView(teamData), path, data);
    } else if (path === "/dashboard/company") {
      app.innerHTML = shellView(companyView(data), path, data);
    } else {
      if (path !== "/dashboard") history.replaceState({}, "", "/dashboard");
      app.innerHTML = shellView(dashboardView(data), "/dashboard", data);
    }
  } catch (error) {
    app.innerHTML = error.code === "authentication_required" ? signInRequiredView() : errorView(error.message);
  }
}

document.addEventListener("click", async (event) => {
  const route = event.target.closest("[data-route]");
  if (route) { event.preventDefault(); navigate(route.dataset.route); return; }

  if (event.target.closest("[data-menu]")) document.querySelector(".sidebar")?.classList.toggle("open");
  if (event.target.closest("[data-open-invite]")) document.querySelector("[data-invite-modal]")?.classList.remove("hidden");
  if (event.target.closest("[data-close-invite]") || (event.target.matches?.("[data-invite-modal]"))) document.querySelector("[data-invite-modal]")?.classList.add("hidden");

  const toggleButton = event.target.closest("[data-toggle-member]");
  if (toggleButton) {
    toggleButton.disabled = true;
    try {
      await api(`/api/team/${toggleButton.dataset.toggleMember}`, { method:"PATCH", body:body({ status:toggleButton.dataset.nextStatus }) });
      toast(toggleButton.dataset.nextStatus === "active" ? "تم تفعيل المستخدم." : "تم تعليق المستخدم.");
      render();
    } catch (error) { toast(error.message, "error"); toggleButton.disabled = false; }
  }

  const revokeButton = event.target.closest("[data-revoke-invite]");
  if (revokeButton) {
    try { await api(`/api/invitations/${revokeButton.dataset.revokeInvite}`, { method:"DELETE" }); toast("تم إلغاء الدعوة."); render(); }
    catch (error) { toast(error.message, "error"); }
  }

  const copyButton = event.target.closest("[data-copy-invite]");
  if (copyButton) {
    const url = new URL(copyButton.dataset.copyInvite, location.origin).href;
    await navigator.clipboard.writeText(url);
    toast("تم نسخ رابط الدعوة.");
  }

  if (event.target.closest("[data-accept-invite]")) {
    const token = location.pathname.split("/")[2];
    try { await api(`/api/invitations/${token}`, { method:"POST", body:"{}" }); toast("تم الانضمام إلى الشركة."); navigate("/dashboard"); }
    catch (error) { toast(error.message, "error"); }
  }
});

document.addEventListener("change", async (event) => {
  const roleSelect = event.target.closest("[data-member-role]");
  if (!roleSelect) return;
  roleSelect.disabled = true;
  try { await api(`/api/team/${roleSelect.dataset.memberRole}`, { method:"PATCH", body:body({ role:roleSelect.value }) }); toast("تم تحديث الدور."); render(); }
  catch (error) { toast(error.message, "error"); render(); }
});

document.addEventListener("input", (event) => {
  if (event.target.id !== "member-search") return;
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll("[data-member-row]").forEach((row) => { row.hidden = !row.dataset.search.includes(query); });
});

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const submit = form.querySelector("button[type=submit]");
  submit.disabled = true;

  try {
    const values = Object.fromEntries(new FormData(form));
    if (form.id === "onboarding-form") {
      await api("/api/tenants", { method:"POST", body:body(values) });
      toast("تم إنشاء مساحة الشركة.");
      navigate("/dashboard");
    } else if (form.id === "invite-form") {
      const result = await api("/api/team", { method:"POST", body:body(values) });
      document.querySelector("[data-invite-modal]")?.classList.add("hidden");
      const inviteUrl = new URL(result.invitation.invitePath, location.origin).href;
      await navigator.clipboard.writeText(inviteUrl).catch(() => {});
      toast("تم إنشاء الدعوة ونسخ رابطها.");
      render();
    } else if (form.id === "company-form") {
      const result = await api("/api/tenant", { method:"PATCH", body:body(values) });
      bootstrapData.tenant = result.tenant;
      toast("تم حفظ إعدادات الشركة.");
      render();
    }
  } catch (error) {
    toast(error.message, "error");
    submit.disabled = false;
  }
});

window.addEventListener("popstate", render);
render();
