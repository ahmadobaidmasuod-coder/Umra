import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { can, canManageRole } from "../worker/permissions.js";

test("enforces the intended role capabilities", () => {
  assert.equal(can("owner", "team:update"), true);
  assert.equal(can("admin", "tenant:update"), true);
  assert.equal(can("manager", "team:invite"), true);
  assert.equal(can("manager", "team:update"), false);
  assert.equal(can("operator", "team:invite"), false);
  assert.equal(can("viewer", "team:read"), true);
});

test("protects owner and admin role boundaries", () => {
  assert.equal(canManageRole("owner", "admin", "manager"), true);
  assert.equal(canManageRole("admin", "manager", "operator"), true);
  assert.equal(canManageRole("admin", "admin", "manager"), false);
  assert.equal(canManageRole("owner", "owner", "admin"), false);
});

test("ships a tenant-scoped schema and API", async () => {
  const [migration, routes, html] = await Promise.all([
    readFile(new URL("../drizzle/0000_handy_sister_grimm.sql", import.meta.url), "utf8"),
    readFile(new URL("../worker/routes.js", import.meta.url), "utf8"),
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  ]);

  for (const table of ["tenants", "users", "tenant_memberships", "tenant_invitations", "audit_logs"]) {
    assert.equal(migration.includes(`CREATE TABLE \`${table}\``), true);
  }
  assert.match(routes, /m\.tenant_id = \?/);
  assert.match(routes, /tenant_invitations WHERE tenant_id = \?/);
  assert.match(html, /lang="ar" dir="rtl"/);
  assert.doesNotMatch(html, /codex-preview/);
});
