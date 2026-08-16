import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const publicRoot = new URL("../public/", import.meta.url);
const publicPath = fileURLToPath(publicRoot);
const port = Number(process.env.PORT || 4173);
const contentTypes = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".png":"image/png", ".svg":"image/svg+xml" };
const now = new Date();

const state = {
  tenant:{ id:"tenant-demo", name:"شركة روافد العمرة", slug:"rawafid-umrah", status:"active", plan:"foundation", maxMembers:25, locale:"ar-SA", timeZone:"Asia/Riyadh", createdAt:new Date(now - 90 * 86400000).toISOString() },
  user:{ id:"user-owner", email:"ahmed@rawafid.sa", displayName:"أحمد السالمي" },
  membership:{ id:"membership-owner", role:"owner" },
  members:[
    { id:"user-owner", membershipId:"membership-owner", email:"ahmed@rawafid.sa", displayName:"أحمد السالمي", role:"owner", status:"active", joinedAt:new Date(now - 90 * 86400000).toISOString(), lastSeenAt:now.toISOString() },
    { id:"user-2", membershipId:"membership-2", email:"mona@rawafid.sa", displayName:"منى الحربي", role:"admin", status:"active", joinedAt:new Date(now - 72 * 86400000).toISOString(), lastSeenAt:new Date(now - 3600000).toISOString() },
    { id:"user-3", membershipId:"membership-3", email:"khaled@rawafid.sa", displayName:"خالد العتيبي", role:"manager", status:"active", joinedAt:new Date(now - 61 * 86400000).toISOString(), lastSeenAt:new Date(now - 5 * 3600000).toISOString() },
    { id:"user-4", membershipId:"membership-4", email:"sara@rawafid.sa", displayName:"سارة القحطاني", role:"operator", status:"active", joinedAt:new Date(now - 42 * 86400000).toISOString(), lastSeenAt:new Date(now - 86400000).toISOString() },
    { id:"user-5", membershipId:"membership-5", email:"fahad@rawafid.sa", displayName:"فهد المطيري", role:"viewer", status:"suspended", joinedAt:new Date(now - 31 * 86400000).toISOString(), lastSeenAt:new Date(now - 9 * 86400000).toISOString() },
  ],
  invitations:[
    { id:"invite-1", email:"reem@rawafid.sa", role:"operator", status:"pending", expiresAt:new Date(now.getTime() + 6 * 86400000).toISOString(), createdAt:now.toISOString(), invitePath:"/invite/demo-invite" },
    { id:"invite-2", email:"omar@rawafid.sa", role:"viewer", status:"pending", expiresAt:new Date(now.getTime() + 4 * 86400000).toISOString(), createdAt:now.toISOString(), invitePath:"/invite/demo-invite-2" },
  ],
};

function bootstrap() {
  const activeMembers = state.members.filter((member) => member.status === "active");
  return { user:state.user, needsOnboarding:false, tenant:state.tenant, membership:state.membership, permissions:{ canManageTenant:true, canInvite:true, canManageTeam:true }, stats:{ members:state.members.length, activeMembers:activeMembers.length, admins:state.members.filter((member) => ["owner", "admin"].includes(member.role)).length, pendingInvitations:state.invitations.length }, recentMembers:state.members.slice(0, 5) };
}

async function readBody(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, data, status = 200) {
  response.writeHead(status, { "content-type":"application/json; charset=utf-8", "cache-control":"no-store" });
  response.end(JSON.stringify(data));
}

async function handleApi(request, response, pathname) {
  if (pathname === "/api/bootstrap" && request.method === "GET") return sendJson(response, bootstrap());
  if (pathname === "/api/team" && request.method === "GET") return sendJson(response, { members:state.members, invitations:state.invitations, membership:state.membership, permissions:{ canInvite:true, canManageTeam:true } });
  if (pathname === "/api/tenant" && request.method === "PATCH") {
    const data = await readBody(request);
    state.tenant = { ...state.tenant, name:data.name, locale:data.locale, timeZone:data.timeZone };
    return sendJson(response, { tenant:state.tenant });
  }
  if (pathname === "/api/team" && request.method === "POST") {
    const data = await readBody(request);
    const invitation = { id:crypto.randomUUID(), email:data.email, role:data.role, status:"pending", expiresAt:new Date(Date.now() + 7 * 86400000).toISOString(), createdAt:new Date().toISOString(), invitePath:`/invite/${crypto.randomUUID()}` };
    state.invitations.unshift(invitation);
    return sendJson(response, { invitation }, 201);
  }
  if (pathname.startsWith("/api/team/") && request.method === "PATCH") {
    const id = pathname.split("/").at(-1);
    const data = await readBody(request);
    const member = state.members.find((item) => item.membershipId === id);
    if (!member) return sendJson(response, { error:"المستخدم غير موجود." }, 404);
    Object.assign(member, data);
    return sendJson(response, { member });
  }
  if (pathname.startsWith("/api/invitations/") && request.method === "DELETE") {
    const id = pathname.split("/").at(-1);
    state.invitations = state.invitations.filter((item) => item.id !== id);
    return sendJson(response, { ok:true });
  }
  if (pathname.startsWith("/api/invitations/") && request.method === "GET") {
    const token = pathname.split("/").at(-1);
    const invitation = state.invitations.find((item) => item.invitePath.endsWith(token)) || state.invitations[0];
    if (!invitation) return sendJson(response, { error:"الدعوة غير موجودة." }, 404);
    return sendJson(response, { invitation:{ tenantName:state.tenant.name, email:invitation.email, role:invitation.role, expiresAt:invitation.expiresAt } });
  }
  if (pathname.startsWith("/api/invitations/") && request.method === "POST") return sendJson(response, { ok:true, tenantName:state.tenant.name });
  if (pathname === "/api/tenants" && request.method === "POST") return sendJson(response, bootstrap(), 201);
  return sendJson(response, { error:"المسار غير موجود." }, 404);
}

createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname.startsWith("/api/")) return handleApi(request, response, pathname);

  const requested = pathname === "/" ? "index.html" : normalize(pathname).replace(/^[/\\]+/, "");
  const file = join(publicPath, requested);
  try {
    const data = await readFile(file);
    response.writeHead(200, { "content-type":contentTypes[extname(file)] || "application/octet-stream" });
    response.end(data);
  } catch {
    const data = await readFile(new URL("../public/index.html", import.meta.url));
    response.writeHead(200, { "content-type":"text/html; charset=utf-8" });
    response.end(data);
  }
}).listen(port, "127.0.0.1", () => console.log(`Local: http://127.0.0.1:${port}`));
