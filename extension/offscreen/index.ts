import { bridgeCommandSchema, type BridgeEvent } from "@shared/bridge-protocol";

let socket: WebSocket | undefined;
let reconnectAttempt = 0;
let pingTimer: number | undefined;

const send = (event: BridgeEvent) => socket?.readyState === WebSocket.OPEN && socket.send(JSON.stringify(event));

async function connect(): Promise<void> {
  const { deviceToken, bridgeUrl = "ws://localhost:3000/bridge" } = await chrome.storage.local.get(["deviceToken", "bridgeUrl"]);
  if (typeof deviceToken !== "string") return;
  socket = new WebSocket(String(bridgeUrl));
  socket.addEventListener("open", () => {
    reconnectAttempt = 0;
    socket!.send(JSON.stringify({ t: "HELLO", deviceToken, extensionVersion: chrome.runtime.getManifest().version } satisfies BridgeEvent));
    pingTimer = setInterval(() => send({ t: "PING", ts: Date.now() }), 20_000) as unknown as number;
  });
  socket.addEventListener("message", async ({ data }) => {
    const command = bridgeCommandSchema.safeParse(JSON.parse(String(data)));
    if (!command.success) return;
    if (command.data.t === "EXECUTE" && command.data.action.kind === "UPLOAD") {
      try {
        const response = await fetch(command.data.action.fileRef, { credentials: "include" });
        if (!response.ok) throw new Error("FILE_FETCH_FAILED");
        const bytes = [...new Uint8Array(await response.arrayBuffer())];
        await chrome.runtime.sendMessage({ channel: "BRIDGE_COMMAND", command: command.data, upload: { bytes, type: response.headers.get("content-type") ?? "application/octet-stream", name: response.headers.get("x-file-name") ?? "document" } });
      } catch (error) {
        send({ t: "STEP_ERROR", runId: command.data.runId, stepIndex: command.data.stepIndex, ok: false, code: "UPLOAD_FAILED", detail: error instanceof Error ? error.message : "UPLOAD_FAILED" });
      }
      return;
    }
    await chrome.runtime.sendMessage({ channel: "BRIDGE_COMMAND", command: command.data });
  });
  socket.addEventListener("close", scheduleReconnect);
  socket.addEventListener("error", () => socket?.close());
}

function scheduleReconnect(): void {
  if (pingTimer) clearInterval(pingTimer);
  const backoff = Math.min(30_000, 1_000 * 2 ** reconnectAttempt++);
  const jitter = Math.floor(Math.random() * 750);
  setTimeout(connect, backoff + jitter);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.channel === "BRIDGE_EVENT") send(message.event as BridgeEvent);
  if (message?.channel === "BRIDGE_RECONNECT" && socket?.readyState !== WebSocket.OPEN) connect();
});
void connect();
