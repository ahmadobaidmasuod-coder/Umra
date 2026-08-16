import type { BridgeCommand, BridgeEvent } from "@shared/bridge-protocol";

let boundTabId: number | undefined;

async function ensureOffscreen(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (contexts.length === 0) await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["WORKERS"], justification: "Maintain the authenticated bridge WebSocket" });
}

async function bindTab(command: Extract<BridgeCommand, { t: "BIND_TAB" }>): Promise<void> {
  const createdWindow = await chrome.windows.create({ url: command.url, type: "popup", focused: true, width: 1280, height: 900 });
  const tab = createdWindow?.tabs?.[0];
  if (!tab?.id) throw new Error("TAB_CREATION_FAILED");
  boundTabId = tab.id;
  await chrome.runtime.sendMessage({ channel: "BRIDGE_EVENT", event: { t: "TAB_BOUND", tabId: tab.id, url: tab.url ?? command.url } satisfies BridgeEvent });
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureOffscreen();
  await chrome.alarms.create("bridge-watchdog", { periodInMinutes: 1 });
});
chrome.runtime.onStartup.addListener(ensureOffscreen);
chrome.alarms.onAlarm.addListener((alarm) => alarm.name === "bridge-watchdog" && chrome.runtime.sendMessage({ channel: "BRIDGE_RECONNECT" }));

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId !== boundTabId) return;
  chrome.runtime.sendMessage({ channel: "BRIDGE_EVENT", event: { t: "TAB_LOST", tabId } satisfies BridgeEvent });
  boundTabId = undefined;
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (tabId !== boundTabId || !change.url) return;
  const allowed = new URL(change.url).hostname.endsWith("nusuk.sa");
  if (!allowed) chrome.runtime.sendMessage({ channel: "BRIDGE_EVENT", event: { t: "TAB_LOST", tabId } satisfies BridgeEvent });
});

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.channel !== "BRIDGE_COMMAND") return;
  const command = message.command as BridgeCommand;
  if (command.t === "BIND_TAB") { bindTab(command).then(() => respond({ ok: true })).catch((error) => respond({ ok: false, error: String(error) })); return true; }
  if (command.t === "REVOKE") { chrome.storage.local.remove("deviceToken"); return; }
  if (command.t !== "EXECUTE" || boundTabId === undefined) return;
  chrome.tabs.sendMessage(boundTabId, { channel: "EXECUTE", command, upload: message.upload }).then((result) => chrome.runtime.sendMessage({ channel: "BRIDGE_EVENT", event: result })).catch((error) => chrome.runtime.sendMessage({ channel: "BRIDGE_EVENT", event: { t: "STEP_ERROR", runId: command.runId, stepIndex: command.stepIndex, ok: false, code: "TAB_CLOSED", detail: String(error) } satisfies BridgeEvent }));
});

void ensureOffscreen();
