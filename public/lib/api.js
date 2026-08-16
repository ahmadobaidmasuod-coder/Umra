export async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers:{ "content-type":"application/json", ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "تعذر إكمال الطلب.");
    error.code = data.code;
    throw error;
  }
  return data;
}

export function body(data) {
  return JSON.stringify(data);
}
