# PokéPrice Implementation Plan — Part 7: PriceCharting Adapter

**Goal:** Scrape ungraded card prices from PriceCharting.

---

### Task 7.1: Write failing tests for PriceCharting adapter

**Files:**
- Create: `lib/sources/__tests__/pricecharting.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// lib/sources/__tests__/pricecharting.test.ts
import { fetchPriceChartingPrices } from "../pricecharting";

global.fetch = jest.fn();

const mockHtml = `
<html><body>
<div id="used_price"><span class="price js-price">$145.00</span></div>
<div id="complete_price"><span class="price js-price">$180.00</span></div>
</body></html>
`;

describe("fetchPriceChartingPrices", () => {
  beforeEach(() => jest.clearAllMocks());

  it("extracts ungraded price from HTML", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
    });

    const result = await fetchPriceChartingPrices("Charizard", "Base Set");
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].source).toBe("pricecharting");
    expect(result[0].price).toBe(145.0);
    expect(result[0].type).toBe("market");
  });

  it("returns empty array on fetch error", async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));
    const result = await fetchPriceChartingPrices("Charizard", "Base Set");
    expect(result).toEqual([]);
  });

  it("returns empty array when price not found in HTML", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => "<html><body>No prices here</body></html>",
    });

    const result = await fetchPriceChartingPrices("Charizard", "Base Set");
    expect(result).toEqual([]);
  });

  it("returns empty array on non-OK response", async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: false, status: 429 });
    const result = await fetchPriceChartingPrices("Charizard", "Base Set");
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest lib/sources/__tests__/pricecharting.test.ts`
Expected: FAIL — `Cannot find module '../pricecharting'`

- [ ] **Step 3: Commit**

```bash
git add lib/sources/__tests__/pricecharting.test.ts
git commit -m "test: add failing tests for PriceCharting adapter"
```

### Task 7.2: Implement PriceCharting adapter

**Files:**
- Create: `lib/sources/pricecharting.ts`

- [ ] **Step 1: Implement the adapter**

```typescript
// lib/sources/pricecharting.ts
import { PriceEntry } from "../types";

const BASE_URL = "https://www.pricecharting.com/game/pokemon";
const TIMEOUT_MS = 5000;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function extractPrice(html: string, id: string): number | null {
  // Match pattern: <div id="used_price"><span class="price js-price">$145.00</span>
  const regex = new RegExp(
    `id=["']${id}["'][^>]*>[\\s\\S]*?\\$([\\d,]+\\.\\d{2})`,
    "i"
  );
  const match = html.match(regex);
  if (!match) return null;
  return parseFloat(match[1].replace(",", ""));
}

export async function fetchPriceChartingPrices(
  cardName: string,
  setName: string
): Promise<PriceEntry[]> {
  try {
    const slug = slugify(`${cardName} ${setName}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${BASE_URL}/${slug}`, {
      headers: { "User-Agent": "PokePriceDashboard/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const html = await res.text();
    const entries: PriceEntry[] = [];
    const now = new Date().toISOString();

    const ungraded = extractPrice(html, "used_price");
    if (ungraded != null) {
      entries.push({
        source: "pricecharting",
        price: ungraded,
        condition: "Ungraded",
        date: now,
        type: "market",
        url: `${BASE_URL}/${slug}`,
      });
    }

    const complete = extractPrice(html, "complete_price");
    if (complete != null) {
      entries.push({
        source: "pricecharting",
        price: complete,
        condition: "Complete",
        date: now,
        type: "market",
        url: `${BASE_URL}/${slug}`,
      });
    }

    return entries;
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Run tests**

Run: `npx jest lib/sources/__tests__/pricecharting.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 3: Commit**

```bash
git add lib/sources/pricecharting.ts
git commit -m "feat: implement PriceCharting scraping adapter"
```
