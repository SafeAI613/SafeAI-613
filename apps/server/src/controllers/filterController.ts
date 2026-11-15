import { Request, Response } from "express";
import {
  createEmbedding,
  getEmbeddings,
} from "../services/filterService";

import {
  createProfile,
  getProfiles,
} from "../services/profileService";
import mongoose from "mongoose";
import { getFullProfileById } from "../repositories/profileRepository";
import { evaluateInput, reasonCode } from "../services/filter/inputFilter";

export async function healthHandler(_req: Request, res: Response) {
  res.send("AI Filter Service running");
}

export async function getEmbeddingsHandler(req: Request, res: Response) {
  try {
    const categories = Array.isArray(req.query.categories)
      ? (req.query.categories as string[])
      : typeof req.query.categories === "string"
      ? [req.query.categories]
      : [];

    const data = await getEmbeddings(categories);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch embeddings" });
  }
}

export async function postEmbeddingHandler(req: Request, res: Response) {
  try {
    await createEmbedding(req.body);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}

export async function postAIProfileHandler(req: Request, res: Response) {
  try {
    const profile = await createProfile(req.body);
    res.json({ success: true, profile });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}

export async function getAIProfilesHandler(_req: Request, res: Response) {
  const profiles = await getProfiles();
  res.json(profiles);
}

/**
 * POST /filter/evaluate — בדיקת טקסט מול פרופיל (ProfileTester באזור האדמין).
 * Auth: authenticateToken + requireAdmin (מפעיל judge בתשלום).
 *
 * body: { profileId: string, text: string, auditDisabled?: boolean }
 * 200: { allowed, verdict: "allowed"|"blocked"|"error", reason: FilterReasonCode,
 *        judgeReason?, error?, judgeModel, latencyMs }
 * 400: profileId/text חסרים או לא תקינים   404: הפרופיל לא נמצא
 */
export async function evaluateHandler(req: Request, res: Response) {
  const { profileId, text, auditDisabled } = req.body ?? {};

  if (
    typeof profileId !== "string" ||
    !mongoose.Types.ObjectId.isValid(profileId) ||
    typeof text !== "string" ||
    !text.trim()
  ) {
    return res.status(400).json({ error: "profileId and text are required" });
  }

  try {
    const profile = await getFullProfileById(profileId);
    if (!profile) return res.status(404).json({ error: "AIProfile not found" });

    const result = await evaluateInput(profile, text, { audit: auditDisabled !== true });
    return res.json({
      ...result,
      allowed: result.verdict === "allowed",
      reason: reasonCode(result),
      ...(result.verdict === "error" ? {} : { judgeReason: result.reason }),
    });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
}
