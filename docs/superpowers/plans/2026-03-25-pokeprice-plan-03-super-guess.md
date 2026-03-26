# PokéPrice Implementation Plan — Part 3: Super Guess Algorithm

**Goal:** Implement the weighted price estimation algorithm with full TDD.

---

### Task 3.1: Write failing tests for Super Guess

**Files:**
- Create: `lib/__tests__/super-guess.test.ts`

- [ ] **Step 1: Install test dependencies**

```bash
npm install -D jest @types/jest ts-jest
```

- [ ] **Step 2: Create Jest config**

Create `jest.config.ts`:
```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/lib"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

export default config;
```

- [ ] **Step 3: Write test file**

```typescript
// lib/__tests__/super-guess.test.ts
import { calculateSuperGuess } from "../super-guess";
import { PriceEntry } from "../types";

const now = new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

describe("calculateSuperGuess", () => {
  it("returns estimate from a single sold listing", () => {
    const prices: PriceEntry[] = [
      { source: "ebay", price: 10.0, condition: "Near Mint", date: now, type: "sold" },
    ];
    const result = calculateSuperGuess(prices);
    expect(result.estimate).toBeCloseTo(10.0, 2);
    expect(result.confidence).toBe("low");
    expect(result.dataPoints).toBe(1);
  });

  it("weights sold listings higher than market prices", () => {
    const prices: PriceEntry[] = [
      { source: "ebay", price: 20.0, condition: "Near Mint", date: now, type: "sold" },
      { source: "tcgplayer", price: 10.0, condition: "Near Mint", date: now, type: "market" },
    ];
    const result = calculateSuperGuess(prices);
    // sold weight 3.0, market weight 1.0 → (20*3 + 10*1) / (3+1) = 17.50
    expect(result.estimate).toBeCloseTo(17.5, 2);
  });

  it("applies recency decay to old data", () => {
    const prices: PriceEntry[] = [
      { source: "ebay", price: 10.0, condition: "Near Mint", date: daysAgo(60), type: "sold" },
    ];
    const result = calculateSuperGuess(prices);
    // 30-90 days → multiplier 0.5, but single price still returns that price
    expect(result.estimate).toBeCloseTo(10.0, 2);
  });

  it("removes outliers beyond 2 standard deviations", () => {
    const prices: PriceEntry[] = [
      { source: "ebay", price: 10.0, condition: "Near Mint", date: now, type: "sold" },
      { source: "ebay", price: 11.0, condition: "Near Mint", date: now, type: "sold" },
      { source: "ebay", price: 10.5, condition: "Near Mint", date: now, type: "sold" },
      { source: "ebay", price: 9.5, condition: "Near Mint", date: now, type: "sold" },
      { source: "ebay", price: 100.0, condition: "Near Mint", date: now, type: "sold" }, // outlier
    ];
    const result = calculateSuperGuess(prices);
    expect(result.estimate).toBeCloseTo(10.25, 1);
    expect(result.dataPoints).toBe(4);
  });

  it("returns high confidence with 5+ recent sold listings", () => {
    const prices: PriceEntry[] = Array.from({ length: 6 }, (_, i) => ({
      source: "ebay" as const,
      price: 10.0 + i * 0.5,
      condition: "Near Mint",
      date: daysAgo(i),
      type: "sold" as const,
    }));
    const result = calculateSuperGuess(prices);
    expect(result.confidence).toBe("high");
  });

  it("returns medium confidence with 2-4 recent sold listings", () => {
    const prices: PriceEntry[] = [
      { source: "ebay", price: 10.0, condition: "Near Mint", date: daysAgo(5), type: "sold" },
      { source: "ebay", price: 11.0, condition: "Near Mint", date: daysAgo(10), type: "sold" },
      { source: "tcgplayer", price: 10.5, condition: "Near Mint", date: now, type: "market" },
    ];
    const result = calculateSuperGuess(prices);
    expect(result.confidence).toBe("medium");
  });

  it("returns zero estimate for empty input", () => {
    const result = calculateSuperGuess([]);
    expect(result.estimate).toBe(0);
    expect(result.confidence).toBe("low");
    expect(result.dataPoints).toBe(0);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx jest lib/__tests__/super-guess.test.ts`
Expected: FAIL — `Cannot find module '../super-guess'`

- [ ] **Step 5: Commit**

```bash
git add jest.config.ts lib/__tests__/super-guess.test.ts package.json package-lock.json
git commit -m "test: add failing tests for Super Guess algorithm"
```

### Task 3.2: Implement Super Guess algorithm

**Files:**
- Create: `lib/super-guess.ts`

- [ ] **Step 1: Implement the algorithm**

```typescript
// lib/super-guess.ts
import { PriceEntry, SuperGuessResult, Confidence } from "./types";

const SOURCE_WEIGHTS: Record<string, number> = {
  sold: 3.0,
  market: 1.0,
  listed: 0.5,
};

function recencyMultiplier(dateStr: string): number {
  const ageMs = Date.now() - new Date(dateStr).getTime();
  const ageDays = ageMs / 86_400_000;
  if (ageDays <= 7) return 1.0;
  if (ageDays <= 30) return 0.8;
  if (ageDays <= 90) return 0.5;
  return 0.3;
}

function removeOutliers(prices: PriceEntry[]): PriceEntry[] {
  if (prices.length < 3) return prices;

  const values = prices.map((p) => p.price).sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  );

  if (stdDev === 0) return prices;

  return prices.filter(
    (p) => Math.abs(p.price - median) <= 2 * stdDev
  );
}

function calculateConfidence(prices: PriceEntry[]): Confidence {
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
  const recentSold = prices.filter(
    (p) => p.type === "sold" && new Date(p.date).getTime() >= thirtyDaysAgo
  ).length;

  if (recentSold >= 5) return "high";
  if (recentSold >= 2) return "medium";
  return "low";
}

export function calculateSuperGuess(prices: PriceEntry[]): SuperGuessResult {
  if (prices.length === 0) {
    return { estimate: 0, confidence: "low", dataPoints: 0, lastUpdated: new Date().toISOString() };
  }

  const filtered = removeOutliers(prices);
  const confidence = calculateConfidence(filtered);

  let weightedSum = 0;
  let weightSum = 0;

  for (const entry of filtered) {
    const sw = SOURCE_WEIGHTS[entry.type] ?? 1.0;
    const rm = recencyMultiplier(entry.date);
    weightedSum += entry.price * sw * rm;
    weightSum += sw * rm;
  }

  const estimate = weightSum > 0 ? weightedSum / weightSum : 0;

  return {
    estimate: Math.round(estimate * 100) / 100,
    confidence,
    dataPoints: filtered.length,
    lastUpdated: new Date().toISOString(),
  };
}
```

- [ ] **Step 2: Run tests**

Run: `npx jest lib/__tests__/super-guess.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 3: Commit**

```bash
git add lib/super-guess.ts
git commit -m "feat: implement Super Guess weighted price algorithm"
```
