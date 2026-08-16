import { HttpError } from "./http.js";

export function requireIdentity(request) {
  const externalId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get("oai-authenticated-user-full-name-encoding");
  if (!externalId || !email) throw new HttpError(401, "يلزم تسجيل الدخول أولًا.", "authentication_required");

  let displayName = email;
  if (encodedName && encoding === "percent-encoded-utf-8") {
    try { displayName = decodeURIComponent(encodedName); } catch { displayName = email; }
  }
  return { externalId, email, displayName };
}
