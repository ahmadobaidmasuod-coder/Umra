import { handleError } from "./http.js";
import { routeApi } from "./routes.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try { return await routeApi(request, env); }
      catch (error) { return handleError(error); }
    }

    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404 || /\.[a-z0-9]+$/i.test(url.pathname)) return asset;
    return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
  },
};
