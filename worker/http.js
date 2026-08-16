export class HttpError extends Error {
  constructor(status, message, code = "request_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function json(data, status = 200) {
  return Response.json(data, { status, headers:{ "cache-control":"no-store", "x-content-type-options":"nosniff" } });
}

export async function readJson(request) {
  try { return await request.json(); }
  catch { throw new HttpError(400, "تعذر قراءة البيانات المرسلة.", "invalid_json"); }
}

export function handleError(error) {
  if (error instanceof HttpError) return json({ error:error.message, code:error.code }, error.status);
  console.error(error);
  return json({ error:"حدث خطأ غير متوقع.", code:"internal_error" }, 500);
}
