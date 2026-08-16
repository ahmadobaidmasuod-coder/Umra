import type { BridgeAction, BridgeErrorCode, BridgeEvent } from "@shared/bridge-protocol";
import { NUSUK_TARGETS } from "@server/adapters/nusuk/registry";
import type { TargetStrategy } from "@server/adapters/nusuk/registry";

type UploadPayload = { bytes: number[]; type: string; name: string };

function visible(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const style = getComputedStyle(element);
  return style.visibility !== "hidden" && style.display !== "none" && element.getClientRects().length > 0 && !("disabled" in element && Boolean((element as HTMLInputElement).disabled));
}

function candidates(strategy: TargetStrategy): Element[] {
  if (strategy.by === "testId") return [...document.querySelectorAll(`[data-testid="${CSS.escape(strategy.value)}"]`)];
  if (strategy.by === "css") return [...document.querySelectorAll(strategy.value)];
  if (strategy.by === "label") {
    const labels = [...document.querySelectorAll("label")].filter((label) => label.textContent?.trim().includes(strategy.value));
    return labels.flatMap((label) => label.htmlFor ? [...document.querySelectorAll(`#${CSS.escape(label.htmlFor)}`)] : [...label.querySelectorAll("input,select,textarea,button")]);
  }
  return [...document.querySelectorAll(`[role="${CSS.escape(strategy.role)}"]`)].filter((element) => (element.getAttribute("aria-label") ?? element.textContent ?? "").includes(strategy.name));
}

function resolveTarget(key: string): HTMLElement {
  const definition = NUSUK_TARGETS[key as keyof typeof NUSUK_TARGETS];
  if (!definition) throw new Error("TARGET_NOT_FOUND");
  for (const strategy of definition.strategies) {
    const matches = candidates(strategy).filter(visible);
    if (matches.length > 1) throw new Error("TARGET_AMBIGUOUS");
    if (matches.length === 1) return matches[0]!;
  }
  throw new Error("TARGET_NOT_FOUND");
}

function nativeSet(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function waitFor(target: string, timeoutMs: number): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    try { resolve(resolveTarget(target)); return; } catch { /* observe DOM changes */ }
    const observer = new MutationObserver(() => {
      try { const element = resolveTarget(target); observer.disconnect(); clearTimeout(timeout); resolve(element); } catch { /* keep observing */ }
    });
    const timeout = setTimeout(() => { observer.disconnect(); reject(new Error("TIMEOUT")); }, timeoutMs);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  });
}

async function execute(action: BridgeAction, upload?: UploadPayload): Promise<unknown> {
  const delay = 200 + Math.floor(Math.random() * 401);
  await new Promise((resolve) => setTimeout(resolve, delay));
  switch (action.kind) {
    case "OPEN_URL": location.assign(action.url); return { url: action.url };
    case "CLICK": resolveTarget(action.target).click(); return {};
    case "FILL": nativeSet(resolveTarget(action.target) as HTMLInputElement, action.value); return {};
    case "SELECT": { const select = resolveTarget(action.target) as HTMLSelectElement; select.value = action.value; select.dispatchEvent(new Event("change", { bubbles: true })); return {}; }
    case "READ": return { value: (resolveTarget(action.target) as HTMLInputElement).value ?? resolveTarget(action.target).textContent };
    case "WAIT_FOR": await waitFor(action.target, action.timeoutMs); return {};
    case "CHECK_EXISTS": { try { resolveTarget(action.target); return { exists: true }; } catch { return { exists: false }; } }
    case "UPLOAD": {
      if (!upload) throw new Error("UPLOAD_FAILED");
      const input = resolveTarget(action.target) as HTMLInputElement;
      const file = new File([new Uint8Array(upload.bytes)], upload.name, { type: upload.type });
      const transfer = new DataTransfer(); transfer.items.add(file); input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true })); return { name: file.name, size: file.size };
    }
    case "SCROLL_TO": resolveTarget(action.target).scrollIntoView({ block: "center" }); return {};
    case "GET_PAGE_STATE": return { url: location.href, title: document.title, markers: [...document.querySelectorAll("[data-page]")].map((element) => element.getAttribute("data-page")).filter(Boolean) };
  }
}

const authLost = (reason: "REDIRECT" | "HTTP_401" | "DOM_MARKER") => chrome.runtime.sendMessage({ channel: "BRIDGE_EVENT", event: { t: "NUSUK_AUTH_LOST", reason } satisfies BridgeEvent });
const inspectUrl = () => /login|signin|auth/i.test(location.pathname) && authLost("REDIRECT");
const originalPushState = history.pushState.bind(history);
history.pushState = (...args) => { originalPushState(...args); inspectUrl(); };
const originalReplaceState = history.replaceState.bind(history);
history.replaceState = (...args) => { originalReplaceState(...args); inspectUrl(); };
addEventListener("popstate", inspectUrl);

const originalFetch = window.fetch.bind(window);
window.fetch = async (...args) => { const response = await originalFetch(...args); if (response.status === 401 || response.status === 403) authLost("HTTP_401"); return response; };
const originalSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
  this.addEventListener("load", () => (this.status === 401 || this.status === 403) && authLost("HTTP_401"));
  return originalSend.call(this, body);
};

new MutationObserver(() => document.querySelector("form input[type=password]") && authLost("DOM_MARKER")).observe(document.documentElement, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.channel !== "EXECUTE") return;
  const { runId, stepIndex, action } = message.command as { runId: string; stepIndex: number; action: BridgeAction };
  const startedAt = performance.now();
  execute(action, message.upload).then((data) => respond({ t: "STEP_RESULT", runId, stepIndex, ok: true, data, durationMs: Math.round(performance.now() - startedAt) } satisfies BridgeEvent)).catch((error) => {
    const messageText = error instanceof Error ? error.message : "UNKNOWN";
    const knownCodes: BridgeErrorCode[] = ["TARGET_NOT_FOUND", "TARGET_AMBIGUOUS", "TIMEOUT", "UPLOAD_FAILED"];
    const code: BridgeErrorCode = knownCodes.includes(messageText as BridgeErrorCode) ? messageText as BridgeErrorCode : "UNKNOWN";
    respond({ t: "STEP_ERROR", runId, stepIndex, ok: false, code, detail: messageText } satisfies BridgeEvent);
  });
  return true;
});
