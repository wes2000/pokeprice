# PokéPrice Dashboard — Design Spec

## Overview

A Pokemon card price aggregation dashboard that lets casual collectors search for any card and see prices from multiple sources (eBay sold listings, TCGplayer, PriceCharting) compiled into a weighted "Super Guess" estimate. Deployed on Vercel with a dark/gold trading platform aesthetic.

## Stack

- **Framework:** Next.js (App Router)
- **Hosting:** Vercel (auto-detected)
- **Caching:** Vercel KV (Redis) — free tier, 30k requests/day
- **Styling:** CSS (globals.css, Gold Rush dark theme)
- **Card Data:** Pokemon TCG API (free, no key required)
- **Language:** TypeScript

## Architecture

### Project Structure

```
pokeprice/
├── app/
│   ├── layout.tsx            # Root layout, metadata, font loading
│   ├── page.tsx              # Main dashboard page
│   └── globals.css           # Gold Rush dark theme
├── app/api/
│   ├── search/route.ts       # Card search → proxies Pokemon TCG API
│   ├── prices/route.ts       # Aggregated cached prices for a card
│   └── refresh/route.ts      # Live refresh, bypasses cache
├── lib/
│   ├── sources/
│   │   ├── ebay.ts           # eBay Browse API adapter (sold listings)
│   │   ├── tcgplayer.ts      # TCGplayer pricing (via Pokemon TCG API)
│   │   └── pricecharting.ts  # PriceCharting scraping adapter
│   ├── super-guess.ts        # Weighted price algorithm
│   ├── cache.ts              # Vercel KV read/write with TTL
│   └── types.ts              # Shared TypeScript types
├── components/
│   ├── SearchBar.tsx          # Flexible input with autocomplete dropdown
│   ├── CardResult.tsx         # Card image + full price breakdown
│   ├── PriceSource.tsx        # Individual source row (name, price, metadata)
│   ├── SuperGuess.tsx         # Highlighted weighted estimate + confidence
│   └── RecentSearches.tsx     # localStorage-backed recent card pills
├── .gitignore
├── .env.local                 # API keys (eBay developer credentials)
├── package.json
├── tsconfig.json
└── vercel.json
```

### Data Flow

1. **Search:** User types in search bar → debounced (300ms) request to `/api/search` → proxies Pokemon TCG API → returns matching cards with images, set name, card number, rarity
2. **Select:** User picks a card from dropdown → request to `/api/prices?cardId=xxx` → checks Vercel KV cache
3. **Cache hit (fresh):** Return cached prices immediately
4. **Cache miss/stale:** Fetch from all sources in parallel (eBay, TCGplayer, PriceCharting) → normalize to common format → run Super Guess algorithm → cache in Vercel KV (TTL: 4 hours) → return
5. **Refresh:** User clicks "Refresh" → `/api/refresh?cardId=xxx` → bypasses cache, fetches live from all sources → updates cache → returns fresh data

### Common Price Data Format

```typescript
interface PriceEntry {
  source: "ebay" | "tcgplayer" | "pricecharting";
  price: number;           // USD
  condition: string;       // e.g., "Near Mint"
  date: string;            // ISO 8601
  type: "sold" | "listed" | "market";
  url?: string;            // Link to source listing
}

interface PriceResult {
  cardId: string;
  cardName: string;
  setName: string;
  cardNumber: string;
  imageUrl: string;
  rarity: string;
  prices: PriceEntry[];
  superGuess: {
    estimate: number;
    confidence: "high" | "medium" | "low";
    dataPoints: number;
    lastUpdated: string;
  };
  sources: {
    ebay?: { low: number; high: number; avg: number; count: number; recentDays: number };
    tcgplayer?: { market: number; low: number; high: number };
    pricecharting?: { ungraded: number; complete?: number };
  };
}
```

## Price Sources

### eBay Browse API

- **Auth:** OAuth client credentials (developer app, free to register)
- **Endpoint:** `browse/v1/item_summary/search` with filter `buyingOptions:{FIXED_PRICE}`, `conditions:{1000}` (New/NM), and sold/completed items
- **Data:** Individual sale prices, dates, condition
- **Rate limits:** 5,000 calls/day on free tier
- **Normalization:** Extract sale price, date, filter to Near Mint condition

### TCGplayer (via Pokemon TCG API)

- **Auth:** None required — Pokemon TCG API includes TCGplayer price data
- **Endpoint:** `api.pokemontcg.io/v2/cards/{id}` — `tcgplayer.prices` field
- **Data:** Market price, low, mid, high for each variant (normal, holofoil, reverseHolofoil, etc.)
- **Normalization:** Use the variant matching the searched card, extract market/low/high

### PriceCharting

- **Auth:** None (web scraping)
- **Method:** Server-side fetch of card page, parse price from HTML
- **Data:** Ungraded price, complete price, graded prices
- **Fallback:** If scraping fails (rate limit, HTML change), gracefully omit this source
- **Normalization:** Extract ungraded NM price as primary

## Super Guess Algorithm

### Step 1: Source Weighting

| Price Type | Weight |
|-----------|--------|
| Sold listing (eBay completed) | 3.0 |
| Market/aggregated (TCGplayer, PriceCharting) | 1.0 |
| Active listing | 0.5 |

### Step 2: Recency Decay

| Age of Data | Multiplier |
|------------|-----------|
| 0–7 days | 1.0 |
| 7–30 days | 0.8 |
| 30–90 days | 0.5 |
| 90+ days | 0.3 |

For market/aggregated prices (TCGplayer, PriceCharting) that don't have individual sale dates, use the cache timestamp as the date — these represent current market consensus.

### Step 3: Outlier Removal

Remove prices beyond 2 standard deviations from the median. This catches:
- Mislistings (wrong card, wrong condition)
- Graded cards mixed into ungraded results
- Bulk lot prices divided incorrectly

### Step 4: Weighted Average

```
Super Guess = Σ(price × source_weight × recency_multiplier) / Σ(source_weight × recency_multiplier)
```

### Step 5: Confidence Rating

| Rating | Criteria |
|--------|---------|
| High | 5+ sold listings within 30 days |
| Medium | 2–4 sold listings within 30 days |
| Low | 0–1 sold listings within 30 days |

## Frontend Design

### Visual Theme: Gold Rush

- **Background:** `#0a0a0f` (near black)
- **Surface:** `#12121a` (dark panels)
- **Border:** `#f59e0b` at low opacity (gold glow)
- **Primary accent:** `#f59e0b` (amber/gold)
- **Highlight text:** `#fbbf24` (bright gold)
- **Body text:** `#e0e0e0`
- **Muted text:** `#666666`
- **Success/confidence:** `#22c55e` (green)
- **Gradient accent:** `linear-gradient(90deg, #f59e0b, #fbbf24, transparent)`
- **Font:** System font stack, monospace for prices

### Layout

Single page, vertically stacked:

1. **Header bar** — "POKÉPRICE" logo left, source attribution right, gold bottom border
2. **Search area** — centered, "SEARCH ANY CARD" label, search input with gold border, autocomplete dropdown beneath
3. **Results area** — two-column: card image (left, ~200px), price panel (right, flex)
   - Super Guess: prominent gold-bordered card with large price, confidence badge, refresh link
   - Source breakdown: stacked rows for each source with name, metadata, price/range
4. **Recent searches** — bottom strip, horizontal scrollable pills with card thumbnail and last Super Guess price

### Search Interaction

- Input accepts any format: card name, name + number, name + set, set code + number
- Debounce at 300ms, minimum 2 characters
- Dropdown shows up to 8 matching cards with: thumbnail, name, number/set, rarity
- Clicking a result or pressing Enter on highlighted result triggers price lookup
- Skeleton loading states while prices load
- Pressing Escape or clicking outside closes dropdown

### Recent Searches

- Stored in `localStorage` as JSON array
- Max 10 entries, newest first
- Each entry: `{ cardId, name, setName, number, imageUrl, lastPrice, timestamp }`
- Clicking a pill re-runs the price lookup for that card
- No "clear all" button needed for MVP

## Environment Variables

```
EBAY_CLIENT_ID=        # eBay developer app client ID
EBAY_CLIENT_SECRET=    # eBay developer app client secret
KV_REST_API_URL=       # Vercel KV connection (auto-set by Vercel)
KV_REST_API_TOKEN=     # Vercel KV token (auto-set by Vercel)
```

## Error Handling

- **Source timeout:** Each source adapter has a 5-second timeout. If a source fails, it's omitted from results — the Super Guess runs on whatever sources respond.
- **No results:** If zero sources return data, show "No pricing data found" with suggestion to check the card name.
- **eBay auth failure:** Cache OAuth tokens, refresh on 401. If auth is completely broken, omit eBay and note it in the UI.
- **Rate limits:** Vercel KV caching (4h TTL) keeps API calls low. eBay's 5k/day and Pokemon TCG API's generous limits should be fine for casual use.

## Deployment

- Push to `wes2000/pokeprice` on GitHub
- Connect repo to Vercel
- Add environment variables (eBay credentials) in Vercel dashboard
- Enable Vercel KV store in project settings
- Vercel auto-detects Next.js and deploys

## Out of Scope (for MVP)

- User accounts / authentication
- Collection management / portfolio tracking
- Price history charts over time
- Graded card pricing
- Condition selector (locked to Near Mint)
- Mobile-specific optimizations (responsive but not mobile-first)
- Internationalization / non-USD currencies
