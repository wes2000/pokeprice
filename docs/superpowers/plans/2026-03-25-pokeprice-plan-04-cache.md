# PokéPrice Implementation Plan — Part 4: Cache Layer

**Goal:** Implement Vercel KV cache abstraction with TTL support.

---

### Task 4.1: Write failing tests for cache

**Files:**
- Create: `lib/__tests__/cache.test.ts`

- [ ] **Step 1: Write cache tests with mocked KV**

```typescript
// lib/__tests__/cache.test.ts
import { getCachedPrices, setCachedPrices } from "../cache";
import { PriceResult } from "../types";

// Mock @vercel/kv
jest.mock("@vercel/kv", () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

import { kv } from "@vercel/kv";

const mockResult: PriceResult = {
  cardId: "base1-4",
  cardName: "Charizard",
  setName: "Base Set",
  cardNumber: "4/102",
  imageUrl: "https://images.pokemontcg.io/base1/4.png",
  rarity: "Rare Holo",
  prices: [],
  superGuess: { estimate: 150.0, confidence: "high", dataPoints: 5, lastUpdated: new Date().toISOString() },
  sources: {},
};

describe("cache", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns cached data on hit", async () => {
    (kv.get as jest.Mock).mockResolvedValue(mockResult);
    const result = await getCachedPrices("base1-4");
    expect(result).toEqual(mockResult);
    expect(kv.get).toHaveBeenCalledWith("prices:base1-4");
  });

  it("returns null on cache miss", async () => {
    (kv.get as jest.Mock).mockResolvedValue(null);
    const result = await getCachedPrices("base1-4");
    expect(result).toBeNull();
  });

  it("sets cache with 4-hour TTL", async () => {
    await setCachedPrices("base1-4", mockResult);
    expect(kv.set).toHaveBeenCalledWith("prices:base1-4", mockResult, { ex: 14400 });
  });

  it("returns null on KV error instead of throwing", async () => {
    (kv.get as jest.Mock).mockRejectedValue(new Error("KV down"));
    const result = await getCachedPrices("base1-4");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest lib/__tests__/cache.test.ts`
Expected: FAIL — `Cannot find module '../cache'`

- [ ] **Step 3: Commit**

```bash
git add lib/__tests__/cache.test.ts
git commit -m "test: add failing tests for cache layer"
```

### Task 4.2: Implement cache layer

**Files:**
- Create: `lib/cache.ts`

- [ ] **Step 1: Implement cache functions**

```typescript
// lib/cache.ts
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
```

- [ ] **Step 2: Run tests**

Run: `npx jest lib/__tests__/cache.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 3: Commit**

```bash
git add lib/cache.ts
git commit -m "feat: implement Vercel KV cache with 4-hour TTL"
```
