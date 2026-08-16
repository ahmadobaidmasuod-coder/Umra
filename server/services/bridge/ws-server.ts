import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { bridgeEventSchema, type BridgeCommand, type BridgeEvent } from "@shared/bridge-protocol";
import { safeLog } from "@server/lib/redactor";

type DeviceSession = { socket: WebSocket; outstanding: { runId: string; stepIndex: number } | undefined };

export class BridgeServer {
  private readonly sessions = new Map<string, DeviceSession>();
  private readonly wss: WebSocketServer;

  constructor(server: Server, private readonly authenticate: (token: string) => Promise<{ deviceId: string } | null>) {
    this.wss = new WebSocketServer({ server, path: "/bridge" });
    this.wss.on("connection", (socket) => this.handleConnection(socket));
  }

  private handleConnection(socket: WebSocket): void {
    let deviceId: string | undefined;
    socket.once("message", async (raw) => {
      const parsed = bridgeEventSchema.safeParse(JSON.parse(raw.toString()));
      if (!parsed.success || parsed.data.t !== "HELLO") { socket.close(1008, "HELLO_REQUIRED"); return; }
      const identity = await this.authenticate(parsed.data.deviceToken);
      if (!identity) { socket.close(1008, "TOKEN_REJECTED"); return; }
      deviceId = identity.deviceId;
      this.sessions.set(deviceId, { socket, outstanding: undefined });
      socket.on("message", (message) => this.handleEvent(deviceId!, JSON.parse(message.toString())));
      socket.on("close", () => this.sessions.delete(deviceId!));
      safeLog("bridge.connected", { deviceId, extensionVersion: parsed.data.extensionVersion });
    });
  }

  private handleEvent(deviceId: string, input: unknown): void {
    const event = bridgeEventSchema.safeParse(input);
    if (!event.success) { safeLog("bridge.invalid_event", { deviceId, issues: event.error.issues }); return; }
    const session = this.sessions.get(deviceId);
    if (!session) return;
    if (event.data.t === "PING") this.send(deviceId, { t: "PONG", ts: event.data.ts });
    if (event.data.t === "STEP_RESULT" || event.data.t === "STEP_ERROR") session.outstanding = undefined;
    this.onEvent?.(deviceId, event.data);
  }

  onEvent?: (deviceId: string, event: BridgeEvent) => void;

  send(deviceId: string, command: BridgeCommand): void {
    const session = this.sessions.get(deviceId);
    if (!session || session.socket.readyState !== WebSocket.OPEN) throw new Error("DEVICE_DISCONNECTED");
    if (command.t === "EXECUTE" && session.outstanding) throw new Error("COMMAND_ALREADY_IN_FLIGHT");
    if (command.t === "EXECUTE") session.outstanding = { runId: command.runId, stepIndex: command.stepIndex };
    session.socket.send(JSON.stringify(command));
  }

  revoke(deviceId: string, reason: string): void {
    const session = this.sessions.get(deviceId);
    if (!session) return;
    session.socket.send(JSON.stringify({ t: "REVOKE", reason } satisfies BridgeCommand));
    session.socket.close(1008, "REVOKED");
    this.sessions.delete(deviceId);
  }
}
