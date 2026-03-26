import { PriceEntry } from "../types";

const EBAY_AUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";
const TIMEOUT_MS = 5000;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(EBAY_AUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
  });

  if (!res.ok) return null;

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };
  return cachedToken.token;
}

export function resetTokenCache(): void {
  cachedToken = null;
}

export async function fetchEbayPrices(
  cardName: string,
  setName: string,
  cardNumber: string
): Promise<PriceEntry[]> {
  try {
    const token = await getAccessToken();
    if (!token) return [];

    const query = `${cardName} ${setName} ${cardNumber} pokemon card`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const params = new URLSearchParams({
      q: query,
      filter: "buyingOptions:{FIXED_PRICE},conditions:{1000|1500|1750|2000|2500}",
      sort: "price",
      limit: "20",
    });

    const res = await fetch(`${EBAY_SEARCH_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      if (res.status === 401) cachedToken = null;
      return [];
    }

    const data = await res.json();
    if (!data.itemSummaries) return [];

    // Browse API returns active listings, not sold — type as "listed" (weight 0.5)
    return data.itemSummaries.map((item: Record<string, unknown>) => ({
      source: "ebay" as const,
      price: parseFloat((item.price as { value: string }).value),
      condition: (item.condition as string) || "Unknown",
      date: (item.itemEndDate as string) || new Date().toISOString(),
      type: "listed" as const,
      url: item.itemWebUrl as string,
    }));
  } catch {
    return [];
  }
}
