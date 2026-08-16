import http from "node:http";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import { routes } from "./routes";
import { BridgeServer } from "./services/bridge/ws-server";
import pgSession from "connect-pg-simple";
import { passport } from "./auth";
import { pool } from "./db";
import { DeviceAuthenticationRepository } from "./repositories/bridge-devices.repository";
import { hashDeviceToken } from "./services/bridge/token";

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
const PgStore = pgSession(session);
app.use(session({ store: new PgStore({ pool, tableName: "user_sessions", createTableIfMissing: true }), secret: process.env.SESSION_SECRET ?? "development-only-change-me-now", resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 * 1000 } }));
app.use(passport.initialize());
app.use(passport.session());
app.use("/api", routes);

const server = http.createServer(app);
const deviceAuth = new DeviceAuthenticationRepository();
new BridgeServer(server, async (token) => {
  const device = await deviceAuth.resolveByTokenHash(hashDeviceToken(token));
  return device ? { deviceId: device.id } : null;
});
const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.info(`server listening on ${port}`));
