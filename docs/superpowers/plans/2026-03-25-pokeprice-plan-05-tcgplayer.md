# PokéPrice Implementation Plan — Part 5: TCGplayer Price Adapter

**Goal:** Fetch TCGplayer pricing via the Pokemon TCG API (no auth required).

---

### Task 5.1: Write failing tests for TCGplayer adapter

**Files:**
- Create: `lib/sources/__tests__/tcgplayer.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// lib/sources/__tests__/tcgplayer.test.ts
import { fetchTcgplayerPrices } from "../tcgplayer";
import { PriceEntry } from "../../types";

// Mock global fetch
global.fetch = jest.fn();

describe("fetchTcgplayerPrices", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns price entries from Pokemon TCG API response", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          tcgplayer: {
            url: "https://tcgplayer.com/product/12345",
            updatedAt: "2026/03/20",
            prices: {
              holofoil: { low: 80.0, mid: 120.0, high: 200.0, market: 110.0 },
            },
          },
        },
      }),
    });

    const result = await fetchTcgplayerPrices("base1-4");
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("tcgplayer");
    expect(result[0].price).toBe(110.0);
    expect(result[0].type).toBe("market");
    expect(result[0].url).toBe("https://tcgplayer.com/product/12345");
  });

  it("returns multiple entries for multiple variants", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          tcgplayer: {
            url: "https://tcgplayer.com/product/12345",
            updatedAt: "2026/03/20",
            prices: {
              normal: { low: 5.0, mid: 8.0, high: 12.0, market: 7.5 },
              reverseHolofoil: { low: 8.0, mid: 12.0, high: 18.0, market: 11.0 },
            },
          },
        },
      }),
    });

    const result = await fetchTcgplayerPrices("base1-4");
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no tcgplayer data", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });

    const result = await fetchTcgplayerPrices("base1-4");
    expect(result).toEqual([]);
  });

  it("returns empty array on fetch error", async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));
    const result = await fetchTcgplayerPrices("base1-4");
    expect(result).toEqual([]);
  });

  it("respects 5-second timeout", async () => {
    (fetch as jest.Mock).mockImplementation((_url: string, opts: RequestInit) => {
      expect(opts.signal).toBeDefined();
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: {} }),
      });
    });

    await fetchTcgplayerPrices("base1-4");
    expect(fetch).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest lib/sources/__tests__/tcgplayer.test.ts`
Expected: FAIL — `Cannot find module '../tcgplayer'`

- [ ] **Step 3: Commit**

```bash
git add lib/sources/__tests__/tcgplayer.test.ts
git commit -m "test: add failing tests for TCGplayer adapter"
```

### Task 5.2: Implement TCGplayer adapter

**Files:**
- Create: `lib/sources/tcgplayer.ts`

- [ ] **Step 1: Implement the adapter**

```typescript
// lib/sources/tcgplayer.ts
import { PriceEntry } from "../types";

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2/cards";
const TIMEOUT_MS = 5000;

interface TcgplayerVariantPrices {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
}

export async function fetchTcgplayerPrices(cardId: string): Promise<PriceEntry[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${POKEMON_TCG_API}/${cardId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const json = await res.json();
    const tcgplayer = json.data?.tcgplayer;
    if (!tcgplayer?.prices) return [];

    const entries: PriceEntry[] = [];
    const dateStr = tcgplayer.updatedAt
      ? new Date(tcgplayer.updatedAt).toISOString()
      : new Date().toISOString();

    for (const [, variantPrices] of Object.entries(tcgplayer.prices)) {
      const vp = variantPrices as TcgplayerVariantPrices;
      if (vp.market != null) {
        entries.push({
          source: "tcgplayer",
          price: vp.market,
          condition: "Near Mint",
          date: dateStr,
          type: "market",
          url: tcgplayer.url,
        });
      }
    }

    return entries;
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Run tests**

Run: `npx jest lib/sources/__tests__/tcgplayer.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 3: Commit**

```bash
git add lib/sources/tcgplayer.ts
git commit -m "feat: implement TCGplayer price adapter via Pokemon TCG API"
```
