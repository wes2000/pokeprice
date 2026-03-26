# PokéPrice Implementation Plan — Part 6: eBay Price Adapter

**Goal:** Fetch active listing prices from eBay Browse API with OAuth. The Browse API returns active (not sold/completed) listings, so these are typed as `"listed"` with weight 0.5 in Super Guess.

> **Note:** The eBay Browse API only returns active listings. Sold/completed listings would require the Finding API or Marketplace Insights API, which need higher-tier eBay developer access. For MVP, we use active listings as a price signal with lower weight.

---

### Task 6.1: Write failing tests for eBay adapter

**Files:**
- Create: `lib/sources/__tests__/ebay.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// lib/sources/__tests__/ebay.test.ts
import { fetchEbayPrices } from "../ebay";

global.fetch = jest.fn();

const mockTokenResponse = {
  ok: true,
  json: async () => ({ access_token: "test-token", expires_in: 7200 }),
};

const mockSearchResponse = {
  ok: true,
  json: async () => ({
    itemSummaries: [
      {
        title: "Charizard Base Set 4/102 Near Mint",
        price: { value: "150.00", currency: "USD" },
        itemEndDate: "2026-03-20T00:00:00Z",
        condition: "New",
        itemWebUrl: "https://ebay.com/itm/123",
      },
      {
        title: "Charizard Base Set 4/102",
        price: { value: "140.00", currency: "USD" },
        itemEndDate: "2026-03-18T00:00:00Z",
        condition: "New",
        itemWebUrl: "https://ebay.com/itm/456",
      },
    ],
  }),
};

describe("fetchEbayPrices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EBAY_CLIENT_ID = "test-id";
    process.env.EBAY_CLIENT_SECRET = "test-secret";
  });

  afterEach(() => {
    delete process.env.EBAY_CLIENT_ID;
    delete process.env.EBAY_CLIENT_SECRET;
  });

  it("fetches OAuth token then searches active listings", async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce(mockTokenResponse)
      .mockResolvedValueOnce(mockSearchResponse);

    const result = await fetchEbayPrices("Charizard", "Base Set", "4/102");
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe("ebay");
    expect(result[0].price).toBe(150.0);
    expect(result[0].type).toBe("listed");
  });

  it("returns empty array when credentials are missing", async () => {
    delete process.env.EBAY_CLIENT_ID;
    const result = await fetchEbayPrices("Charizard", "Base Set", "4/102");
    expect(result).toEqual([]);
  });

  it("returns empty array on auth failure", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401 });
    const result = await fetchEbayPrices("Charizard", "Base Set", "4/102");
    expect(result).toEqual([]);
  });

  it("returns empty array when no itemSummaries", async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce(mockTokenResponse)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const result = await fetchEbayPrices("Charizard", "Base Set", "4/102");
    expect(result).toEqual([]);
  });

  it("reuses cached token on second call", async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce(mockTokenResponse)
      .mockResolvedValueOnce(mockSearchResponse)
      .mockResolvedValueOnce(mockSearchResponse); // second call, no token fetch

    await fetchEbayPrices("Charizard", "Base Set", "4/102");
    await fetchEbayPrices("Pikachu", "Base Set", "58/102");
    // 3 fetch calls total: 1 token + 2 searches (token was cached)
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest lib/sources/__tests__/ebay.test.ts`
Expected: FAIL — `Cannot find module '../ebay'`

- [ ] **Step 3: Commit**

```bash
git add lib/sources/__tests__/ebay.test.ts
git commit -m "test: add failing tests for eBay adapter"
```

### Task 6.2: Implement eBay adapter

**Files:**
- Create: `lib/sources/ebay.ts`

- [ ] **Step 1: Implement the adapter**

```typescript
// lib/sources/ebay.ts
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
    expiresAt: Date.now() + (data.expires_in - 300) * 1000, // refresh 5min early
  };
  return cachedToken.token;
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
```

- [ ] **Step 2: Run tests**

Run: `npx jest lib/sources/__tests__/ebay.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 3: Commit**

```bash
git add lib/sources/ebay.ts
git commit -m "feat: implement eBay Browse API adapter with OAuth (active listings)"
```
