import { kv } from "@vercel/kv";
import { PriceResult } from "./types";

const CACHE_TTL_SECONDS = 4 * 60 * 60; // 4 hours
const KEY_PREFIX = "prices:";

export async function getCachedPrices(cardId: string): Promise<PriceResult | null> {
  try {
    return await kv.get<PriceResult>(`${KEY_PREFIX}${cardId}`);
  } catch {
    return null;
  }
}

export async function setCachedPrices(cardId: string, data: PriceResult): Promise<void> {
  try {
    await kv.set(`${KEY_PREFIX}${cardId}`, data, { ex: CACHE_TTL_SECONDS });
  } catch {
    // Cache write failure is non-fatal
  }
}
