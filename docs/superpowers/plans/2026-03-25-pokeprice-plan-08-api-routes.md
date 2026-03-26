# PokéPrice Implementation Plan — Part 8: API Routes

**Goal:** Implement search, prices, and refresh API endpoints, plus a shared source summary utility.

---

### Task 8.1: Extract buildSourceSummary to shared lib

**Files:**
- Create: `lib/source-summary.ts`

- [ ] **Step 1: Create the shared utility**

```typescript
// lib/source-summary.ts
import { PriceEntry, SourceSummary } from "./types";

export function buildSourceSummary(prices: PriceEntry[]): SourceSummary {
  const summary: SourceSummary = {};

  const ebayPrices = prices.filter((p) => p.source === "ebay");
  if (ebayPrices.length > 0) {
    const vals = ebayPrices.map((p) => p.price);
    const maxAgeDays = Math.max(
      ...ebayPrices.map((p) => Math.ceil((Date.now() - new Date(p.date).getTime()) / 86_400_000))
    );
    summary.ebay = {
      low: Math.min(...vals),
      high: Math.max(...vals),
      avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
      count: vals.length,
      recentDays: maxAgeDays,
    };
  }

  const tcgPrices = prices.filter((p) => p.source === "tcgplayer");
  if (tcgPrices.length > 0) {
    const vals = tcgPrices.map((p) => p.price);
    summary.tcgplayer = {
      market: vals[0],
      low: Math.min(...vals),
      high: Math.max(...vals),
    };
  }

  const pcPrices = prices.filter((p) => p.source === "pricecharting");
  if (pcPrices.length > 0) {
    const ungraded = pcPrices.find((p) => p.condition === "Ungraded");
    const complete = pcPrices.find((p) => p.condition === "Complete");
    if (ungraded) {
      summary.pricecharting = {
        ungraded: ungraded.price,
        complete: complete?.price,
      };
    }
  }

  return summary;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/source-summary.ts
git commit -m "feat: extract buildSourceSummary to shared utility"
```

### Task 8.2: Implement search API route

**Files:**
- Create: `app/api/search/route.ts`

- [ ] **Step 1: Create the search route**

```typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CardSearchResult } from "@/lib/types";

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2/cards";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    // Sanitize: strip quotes from query to prevent TCG API query injection
    const sanitized = q.replace(/["']/g, "");
    const res = await fetch(
      `${POKEMON_TCG_API}?q=name:"${encodeURIComponent(sanitized)}*"&pageSize=8&select=id,name,set,number,rarity,images`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok) {
      return NextResponse.json({ results: [] }, { status: 502 });
    }

    const data = await res.json();
    const results: CardSearchResult[] = (data.data || []).map(
      (card: Record<string, unknown>) => ({
        id: card.id,
        name: card.name,
        setName: (card.set as { name: string })?.name || "",
        number: `${card.number}/${(card.set as { printedTotal: number })?.printedTotal || "?"}`,
        rarity: (card.rarity as string) || "Unknown",
        imageUrl: (card.images as { small: string })?.small || "",
      })
    );

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/search/route.ts
git commit -m "feat: add card search API route proxying Pokemon TCG API"
```

### Task 8.3: Implement prices API route

**Files:**
- Create: `app/api/prices/route.ts`

- [ ] **Step 1: Create the prices route**

```typescript
// app/api/prices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCachedPrices, setCachedPrices } from "@/lib/cache";
import { calculateSuperGuess } from "@/lib/super-guess";
import { buildSourceSummary } from "@/lib/source-summary";
import { fetchTcgplayerPrices } from "@/lib/sources/tcgplayer";
import { fetchEbayPrices } from "@/lib/sources/ebay";
import { fetchPriceChartingPrices } from "@/lib/sources/pricecharting";
import { PriceResult } from "@/lib/types";

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2/cards";

export async function GET(req: NextRequest) {
  const cardId = req.nextUrl.searchParams.get("cardId");
  if (!cardId) {
    return NextResponse.json({ error: "cardId required" }, { status: 400 });
  }

  // Check cache first
  const cached = await getCachedPrices(cardId);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Fetch card metadata from Pokemon TCG API
  let cardName = "", setName = "", cardNumber = "", imageUrl = "", rarity = "";
  try {
    const metaRes = await fetch(`${POKEMON_TCG_API}/${cardId}`);
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const card = meta.data;
      cardName = card.name || "";
      setName = card.set?.name || "";
      cardNumber = `${card.number}/${card.set?.printedTotal || "?"}`;
      imageUrl = card.images?.small || "";
      rarity = card.rarity || "Unknown";
    }
  } catch {
    // Continue without metadata
  }

  // Fetch all sources in parallel
  const [tcgPrices, ebayPrices, pcPrices] = await Promise.all([
    fetchTcgplayerPrices(cardId),
    fetchEbayPrices(cardName, setName, cardNumber),
    fetchPriceChartingPrices(cardName, setName),
  ]);

  const allPrices = [...tcgPrices, ...ebayPrices, ...pcPrices];
  const superGuess = calculateSuperGuess(allPrices);
  const sources = buildSourceSummary(allPrices);

  const result: PriceResult = {
    cardId, cardName, setName, cardNumber, imageUrl, rarity,
    prices: allPrices, superGuess, sources,
  };

  // Cache the result
  await setCachedPrices(cardId, result);

  return NextResponse.json(result);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/prices/route.ts
git commit -m "feat: add prices API route with parallel source fetching"
```

### Task 8.4: Implement refresh API route

**Files:**
- Create: `app/api/refresh/route.ts`

- [ ] **Step 1: Create the refresh route**

```typescript
// app/api/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import { setCachedPrices } from "@/lib/cache";
import { calculateSuperGuess } from "@/lib/super-guess";
import { buildSourceSummary } from "@/lib/source-summary";
import { fetchTcgplayerPrices } from "@/lib/sources/tcgplayer";
import { fetchEbayPrices } from "@/lib/sources/ebay";
import { fetchPriceChartingPrices } from "@/lib/sources/pricecharting";
import { PriceResult } from "@/lib/types";

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2/cards";

export async function GET(req: NextRequest) {
  const cardId = req.nextUrl.searchParams.get("cardId");
  if (!cardId) {
    return NextResponse.json({ error: "cardId required" }, { status: 400 });
  }

  // Fetch card metadata
  let cardName = "", setName = "", cardNumber = "", imageUrl = "", rarity = "";
  try {
    const metaRes = await fetch(`${POKEMON_TCG_API}/${cardId}`);
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const card = meta.data;
      cardName = card.name || "";
      setName = card.set?.name || "";
      cardNumber = `${card.number}/${card.set?.printedTotal || "?"}`;
      imageUrl = card.images?.small || "";
      rarity = card.rarity || "Unknown";
    }
  } catch { /* continue */ }

  // Always fetch fresh — no cache check
  const [tcgPrices, ebayPrices, pcPrices] = await Promise.all([
    fetchTcgplayerPrices(cardId),
    fetchEbayPrices(cardName, setName, cardNumber),
    fetchPriceChartingPrices(cardName, setName),
  ]);

  const allPrices = [...tcgPrices, ...ebayPrices, ...pcPrices];
  const superGuess = calculateSuperGuess(allPrices);
  const sources = buildSourceSummary(allPrices);

  const result: PriceResult = {
    cardId, cardName, setName, cardNumber, imageUrl, rarity,
    prices: allPrices, superGuess, sources,
  };

  // Update cache with fresh data
  await setCachedPrices(cardId, result);

  return NextResponse.json(result);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/refresh/route.ts
git commit -m "feat: add refresh API route that bypasses cache"
```
