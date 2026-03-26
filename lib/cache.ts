import { PriceResult } from "./types";

const CACHE_TTL_SECONDS = 4 * 60 * 60; // 4 hours
const KEY_PREFIX = "prices:";

async function getKv() {
  try {
    const { kv } = await import("@vercel/kv");
    return kv;
  } catch {
    return null;
  }
}

export async function getCachedPrices(cardId: string): Promise<PriceResult | null> {
  try {
    const kv = await getKv();
    if (!kv) return null;
    return await kv.get<PriceResult>(`${KEY_PREFIX}${cardId}`);
  } catch {
    return null;
  }
}

export async function setCachedPrices(cardId: string, data: PriceResult): Promise<void> {
  try {
    const kv = await getKv();
    if (!kv) return;
    await kv.set(`${KEY_PREFIX}${cardId}`, data, { ex: CACHE_TTL_SECONDS });
  } catch {
    // Cache write failure is non-fatal
  }
}
