import type { Request, Response } from "express";
import { z } from "zod";
import { exchangePairingCode, issuePairingCode } from "@server/services/bridge/pairing";

const exchangeSchema = z.object({ code: z.string().min(8), extensionVersion: z.string().min(1).max(32) });
export async function createPairingCode(req: Request, res: Response): Promise<void> { res.status(201).json(await issuePairingCode(req.ctx!)); }
export async function pairDevice(req: Request, res: Response): Promise<void> {
  const input = exchangeSchema.safeParse(req.body);
  if (!input.success) { res.status(400).json({ code: "VALIDATION_ERROR", issues: input.error.issues }); return; }
  try { res.status(201).json(await exchangePairingCode(input.data.code, input.data.extensionVersion)); }
  catch { res.status(401).json({ code: "PAIRING_CODE_INVALID" }); }
}
