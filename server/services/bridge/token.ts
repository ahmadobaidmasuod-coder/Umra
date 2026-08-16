import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const createPairingCode = () => randomBytes(6).toString("base64url");
export const createDeviceToken = () => randomBytes(32).toString("base64url");
export const hashDeviceToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const verifyDeviceToken = (token: string, expectedHash: string) => {
  const actual = Buffer.from(hashDeviceToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
