/**
 * server/src/services/filterService.ts
 *
 * שירותי embeddings (סינון וקטורי ישן). לא בשימוש בזרימת הסינון הנוכחית,
 * וה-handlers שלהם ב-filterController לא מחוברים לאף route.
 * סינון הקלט עצמו נמצא ב-services/filter/.
 */

import { Embedding } from "../models";
import { addEmbeddingToCache } from "../cache/embeddingCache";
import { EmbeddingRequest } from "../types/proxyTypes";
import { openai } from "../config/openai";

/* ---------- Embeddings (לא בשימוש בזרימה הנוכחית, נשמר לעתיד) ---------- */

export async function getEmbeddings(categories: string[] = []) {
  return Embedding.find({ category: { $in: categories } });
}

export async function createEmbedding(req: EmbeddingRequest) {
  const { category, originText } = req;

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: originText,
  });

  const vector = response.data?.[0]?.embedding;
  if (!vector) {
    throw new Error("Embedding failed");
  }

  await Embedding.create({ category, originText, vector });
  addEmbeddingToCache(category, vector);
}