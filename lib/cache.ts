import { PriceResult } from "./types";

const PRICE_TTL = 24 * 60 * 60; // 24 hours
const SET_TTL = 24 * 60 * 60; // 24 hours
const SEARCH_TTL = 6 * 60 * 60; // 6 hours

const PRICE_PREFIX = "prices:";
const SET_PREFIX = "set:";
const SEARCH_PREFIX = "search:";

async function getKv() {
  try {
    const { kv } = await import("@vercel/kv");
    return kv;
  } catch {
    return null;
  }
}

// --- Price cache ---

export async function getCachedPrices(cardId: string): Promise<PriceResult | null> {
  try {
    const kv = await getKv();
    if (!kv) return null;
    return await kv.get<PriceResult>(`${PRICE_PREFIX}${cardId}`);
  } catch {
    return null;
  }
}

export async function setCachedPrices(cardId: string, data: PriceResult): Promise<void> {
  try {
    const kv = await getKv();
    if (!kv) return;
    await kv.set(`${PRICE_PREFIX}${cardId}`, data, { ex: PRICE_TTL });
  } catch {}
}

// --- Set cache ---

export async function getCachedSet<T>(setId: string): Promise<T | null> {
  try {
    const kv = await getKv();
    if (!kv) return null;
    return await kv.get<T>(`${SET_PREFIX}${setId}`);
  } catch {
    return null;
  }
}

export async function setCachedSet<T>(setId: string, data: T): Promise<void> {
  try {
    const kv = await getKv();
    if (!kv) return;
    await kv.set(`${SET_PREFIX}${setId}`, data, { ex: SET_TTL });
  } catch {}
}

// --- Search cache ---

export async function getCachedSearch<T>(query: string): Promise<T | null> {
  try {
    const kv = await getKv();
    if (!kv) return null;
    return await kv.get<T>(`${SEARCH_PREFIX}${query.toLowerCase().trim()}`);
  } catch {
    return null;
  }
}

export async function setCachedSearch<T>(query: string, data: T): Promise<void> {
  try {
    const kv = await getKv();
    if (!kv) return;
    await kv.set(`${SEARCH_PREFIX}${query.toLowerCase().trim()}`, data, { ex: SEARCH_TTL });
  } catch {}
}
