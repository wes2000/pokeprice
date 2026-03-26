# PokéPrice Implementation Plan — Part 2: Shared Types

**Goal:** Define all shared TypeScript interfaces used across the app.

---

### Task 2.1: Create shared types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write the types file**

```typescript
// lib/types.ts

export type PriceSourceName = "ebay" | "tcgplayer" | "pricecharting";
export type PriceType = "sold" | "listed" | "market";
export type Confidence = "high" | "medium" | "low";

export interface PriceEntry {
  source: PriceSourceName;
  price: number;
  condition: string;
  date: string; // ISO 8601
  type: PriceType;
  url?: string;
}

export interface SourceSummary {
  ebay?: { low: number; high: number; avg: number; count: number; recentDays: number };
  tcgplayer?: { market: number; low: number; high: number };
  pricecharting?: { ungraded: number; complete?: number };
}

export interface SuperGuessResult {
  estimate: number;
  confidence: Confidence;
  dataPoints: number;
  lastUpdated: string; // ISO 8601
}

export interface PriceResult {
  cardId: string;
  cardName: string;
  setName: string;
  cardNumber: string;
  imageUrl: string;
  rarity: string;
  prices: PriceEntry[];
  superGuess: SuperGuessResult;
  sources: SourceSummary;
}

export interface CardSearchResult {
  id: string;
  name: string;
  setName: string;
  number: string;
  rarity: string;
  imageUrl: string;
}

export interface RecentSearch {
  cardId: string;
  name: string;
  setName: string;
  number: string;
  imageUrl: string;
  lastPrice: number;
  timestamp: string; // ISO 8601
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared TypeScript type definitions"
```
