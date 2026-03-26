import { PriceEntry } from "../types";

const IS_SANDBOX = process.env.EBAY_SANDBOX === "true";
const EBAY_BASE = IS_SANDBOX ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
const EBAY_AUTH_URL = `${EBAY_BASE}/identity/v1/oauth2/token`;
const EBAY_SEARCH_URL = `${EBAY_BASE}/buy/browse/v1/item_summary/search`;
const EBAY_FINDING_URL = "https://svcs.ebay.com/services/search/FindingService/v1";
const TIMEOUT_MS = 5000;

// eBay condition ID → readable label
const CONDITION_MAP: Record<string, string> = {
  "1000": "New",
  "1500": "New (Other)",
  "1750": "New (Defects)",
  "2000": "Refurbished",
  "2500": "Seller Refurbished",
  "3000": "Used",
  "4000": "Very Good",
  "5000": "Good",
  "6000": "Acceptable",
  "7000": "For Parts",
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn("[eBay] Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET");
    return null;
  }

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
    body: `grant_type=client_credentials&scope=${encodeURIComponent(
      "https://api.ebay.com/oauth/api_scope"
    )}`,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[eBay] Auth failed: ${res.status} ${res.statusText}`, body);
    return null;
  }

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

function resolveCondition(item: Record<string, unknown>): string {
  // Browse API: condition can be a string or conditionId can be present
  if (item.condition && typeof item.condition === "string" && item.condition !== "Unknown") {
    return item.condition;
  }
  if (item.conditionId) {
    return CONDITION_MAP[String(item.conditionId)] || String(item.conditionId);
  }
  return "Unknown";
}

/** Fetch active listings via Browse API */
async function fetchActiveListings(
  token: string,
  query: string
): Promise<PriceEntry[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const params = new URLSearchParams({
    q: query,
    filter: "buyingOptions:{FIXED_PRICE},conditions:{1000|1500|1750|2000|2500|3000}",
    sort: "price",
    limit: "20",
  });

  const res = await fetch(`${EBAY_SEARCH_URL}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[eBay] Browse search failed: ${res.status}`, body);
    if (res.status === 401) cachedToken = null;
    return [];
  }

  const data = await res.json();
  if (!data.itemSummaries) return [];

  console.log(`[eBay] Found ${data.itemSummaries.length} active listings for "${query}"`);
  return data.itemSummaries.map((item: Record<string, unknown>) => ({
    source: "ebay" as const,
    price: parseFloat((item.price as { value: string }).value),
    condition: resolveCondition(item),
    date: (item.itemEndDate as string) || new Date().toISOString(),
    type: "listed" as const,
    url: item.itemWebUrl as string,
  }));
}

/** Fetch recently sold items via Finding API (findCompletedItems) */
async function fetchSoldListings(query: string): Promise<PriceEntry[]> {
  const appId = process.env.EBAY_CLIENT_ID;
  if (!appId || IS_SANDBOX) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const params = new URLSearchParams({
    "OPERATION-NAME": "findCompletedItems",
    "SERVICE-VERSION": "1.13.0",
    "SECURITY-APPNAME": appId,
    "RESPONSE-DATA-FORMAT": "JSON",
    "REST-PAYLOAD": "",
    keywords: query,
    "categoryId": "183454", // Pokemon TCG
    "itemFilter(0).name": "SoldItemsOnly",
    "itemFilter(0).value": "true",
    "sortOrder": "EndTimeSoonest",
    "paginationInput.entriesPerPage": "15",
  });

  try {
    const res = await fetch(`${EBAY_FINDING_URL}?${params}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[eBay] Finding API failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const result = data.findCompletedItemsResponse?.[0];
    const items = result?.searchResult?.[0]?.item;

    if (!items || items.length === 0) return [];

    console.log(`[eBay] Found ${items.length} sold listings for "${query}"`);
    return items.map((item: Record<string, unknown>) => {
      const sellingStatus = item.sellingStatus as { currentPrice: { __value__: string }[] }[];
      const priceVal = sellingStatus?.[0]?.currentPrice?.[0]?.["__value__"] || "0";
      const condition = (item.condition as { conditionDisplayName: string[] }[])?.[0]?.conditionDisplayName?.[0] || "Unknown";
      const endTime = (item.listingInfo as { endTime: string[] }[])?.[0]?.endTime?.[0] || new Date().toISOString();
      const viewUrl = (item.viewItemURL as string[])?.[0] || "";

      return {
        source: "ebay" as const,
        price: parseFloat(priceVal),
        condition,
        date: endTime,
        type: "sold" as const,
        url: viewUrl,
      };
    }).filter((e: PriceEntry) => e.price > 0);
  } catch (err) {
    console.error("[eBay] Finding API error:", err);
    return [];
  }
}

export async function fetchEbayPrices(
  cardName: string,
  setName: string,
  cardNumber: string
): Promise<PriceEntry[]> {
  try {
    const token = await getAccessToken();
    const query = `${cardName} ${setName} ${cardNumber} pokemon card`;

    // Fetch active and sold listings in parallel
    const [active, sold] = await Promise.all([
      token ? fetchActiveListings(token, query) : Promise.resolve([]),
      fetchSoldListings(query),
    ]);

    return [...sold, ...active];
  } catch (err) {
    console.error("[eBay] Unexpected error:", err);
    return [];
  }
}
