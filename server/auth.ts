import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { eq, isNull, and } from "drizzle-orm";
import { users } from "@shared/schema";
import { db } from "./db";

const scrypt = promisify(scryptCallback);
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

passport.use(new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
  try {
    const user = await db.query.users.findFirst({ where: and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)) });
    if (!user || !(await verifyPassword(password, user.passwordHash))) return done(null, false);
    return done(null, { id: user.id });
  } catch (error) { return done(error); }
}));
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await db.query.users.findFirst({ where: and(eq(users.id, id), isNull(users.deletedAt)), columns: { id: true } });
    done(null, user ?? false);
  } catch (error) { done(error); }
});
export { passport };
