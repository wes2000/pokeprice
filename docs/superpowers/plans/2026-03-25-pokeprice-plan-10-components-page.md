# PokéPrice Implementation Plan — Part 10: Components & Main Page

**Goal:** Build all React components and wire the main dashboard page.

---

### Task 10.1: Create PriceSource component

**Files:**
- Create: `components/PriceSource.tsx`

- [ ] **Step 1: Implement PriceSource**

```typescript
// components/PriceSource.tsx
"use client";

interface PriceSourceProps {
  name: string;
  meta: string;
  price: string;
  url?: string;
}

export default function PriceSource({ name, meta, price, url }: PriceSourceProps) {
  return (
    <div className="price-source">
      <div>
        <div className="price-source__name">{name}</div>
        <div className="price-source__meta">{meta}</div>
      </div>
      <div>
        <span className="price-source__price">{price}</span>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, fontSize: "0.75rem", color: "#f59e0b" }}>
            View →
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/PriceSource.tsx
git commit -m "feat: add PriceSource component"
```

### Task 10.2: Create SuperGuess component

**Files:**
- Create: `components/SuperGuess.tsx`

- [ ] **Step 1: Implement SuperGuess**

```typescript
// components/SuperGuess.tsx
"use client";

import { SuperGuessResult } from "@/lib/types";

interface SuperGuessProps {
  data: SuperGuessResult;
  onRefresh: () => void;
  refreshing: boolean;
}

export default function SuperGuess({ data, onRefresh, refreshing }: SuperGuessProps) {
  return (
    <div className="super-guess">
      <div className="super-guess__label">Super Guess Estimate</div>
      <div className="super-guess__price">${data.estimate.toFixed(2)}</div>
      <div className="super-guess__meta">
        <span className={`super-guess__confidence super-guess__confidence--${data.confidence}`}>
          {data.confidence} confidence
        </span>
        <span>{data.dataPoints} data points</span>
        <button className="super-guess__refresh" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Refreshing..." : "Refresh prices"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/SuperGuess.tsx
git commit -m "feat: add SuperGuess component"
```

### Task 10.3: Create CardResult component

**Files:**
- Create: `components/CardResult.tsx`

- [ ] **Step 1: Implement CardResult**

```typescript
// components/CardResult.tsx
"use client";

import { PriceResult } from "@/lib/types";
import SuperGuess from "./SuperGuess";
import PriceSource from "./PriceSource";

interface CardResultProps {
  data: PriceResult;
  onRefresh: () => void;
  refreshing: boolean;
}

export default function CardResult({ data, onRefresh, refreshing }: CardResultProps) {
  return (
    <div className="result">
      <img className="result__image" src={data.imageUrl} alt={data.cardName} />
      <div className="result__prices">
        <SuperGuess data={data.superGuess} onRefresh={onRefresh} refreshing={refreshing} />

        {data.sources.ebay && (
          <PriceSource
            name="eBay Listings"
            meta={`${data.sources.ebay.count} listings, last ${data.sources.ebay.recentDays} days`}
            price={`$${data.sources.ebay.avg.toFixed(2)} avg ($${data.sources.ebay.low.toFixed(2)} – $${data.sources.ebay.high.toFixed(2)})`}
          />
        )}

        {data.sources.tcgplayer && (
          <PriceSource
            name="TCGplayer"
            meta="Market price"
            price={`$${data.sources.tcgplayer.market.toFixed(2)} ($${data.sources.tcgplayer.low.toFixed(2)} – $${data.sources.tcgplayer.high.toFixed(2)})`}
          />
        )}

        {data.sources.pricecharting && (
          <PriceSource
            name="PriceCharting"
            meta={data.sources.pricecharting.complete ? "Ungraded / Complete" : "Ungraded"}
            price={
              data.sources.pricecharting.complete
                ? `$${data.sources.pricecharting.ungraded.toFixed(2)} / $${data.sources.pricecharting.complete.toFixed(2)}`
                : `$${data.sources.pricecharting.ungraded.toFixed(2)}`
            }
          />
        )}

        {!data.sources.ebay && !data.sources.tcgplayer && !data.sources.pricecharting && (
          <div style={{ color: "#666", textAlign: "center", padding: 32 }}>
            No pricing data found. Try checking the card name.
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/CardResult.tsx
git commit -m "feat: add CardResult component with source breakdown"
```

### Task 10.4: Create SearchBar component

**Files:**
- Create: `components/SearchBar.tsx`

- [ ] **Step 1: Implement SearchBar**

```typescript
// components/SearchBar.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { CardSearchResult } from "@/lib/types";

interface SearchBarProps {
  onSelect: (card: CardSearchResult) => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
        setOpen(data.results?.length > 0);
        setActiveIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectCard(results[activeIndex]);
    }
  }

  function selectCard(card: CardSearchResult) {
    setQuery(card.name);
    setOpen(false);
    onSelect(card);
  }

  return (
    <div className="search" ref={containerRef}>
      <label className="search__label">Search Any Card</label>
      <input
        className="search__input"
        type="text"
        placeholder="Charizard, Base Set 4/102, XY Evolutions..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {loading && (
        <div style={{ position: "absolute", right: 40, top: "50%", color: "#666", fontSize: "0.8rem" }}>
          Searching...
        </div>
      )}
      {open && (
        <div className="search__dropdown">
          {results.map((card, i) => (
            <div
              key={card.id}
              className={`search__item ${i === activeIndex ? "search__item--active" : ""}`}
              onClick={() => selectCard(card)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <img className="search__item-image" src={card.imageUrl} alt={card.name} />
              <div>
                <div className="search__item-name">{card.name}</div>
                <div className="search__item-meta">{card.setName} · {card.number} · {card.rarity}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/SearchBar.tsx
git commit -m "feat: add SearchBar component with autocomplete"
```

### Task 10.5: Create RecentSearches component

**Files:**
- Create: `components/RecentSearches.tsx`

- [ ] **Step 1: Implement RecentSearches**

```typescript
// components/RecentSearches.tsx
"use client";

import { useEffect, useState } from "react";
import { RecentSearch, CardSearchResult } from "@/lib/types";

const STORAGE_KEY = "pokeprice-recent";
const MAX_RECENT = 10;

// Custom event for same-tab localStorage updates
const RECENT_UPDATED_EVENT = "pokeprice-recent-updated";

export function addRecentSearch(entry: RecentSearch) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as RecentSearch[];
    const filtered = stored.filter((s) => s.cardId !== entry.cardId);
    const updated = [entry, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch custom event for same-tab listeners (storage event only fires cross-tab)
    window.dispatchEvent(new Event(RECENT_UPDATED_EVENT));
  } catch { /* localStorage unavailable */ }
}

interface RecentSearchesProps {
  onSelect: (card: CardSearchResult) => void;
}

export default function RecentSearches({ onSelect }: RecentSearchesProps) {
  const [recent, setRecent] = useState<RecentSearch[]>([]);

  function readRecent() {
    try {
      setRecent(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch { /* ignore */ }
  }

  useEffect(() => {
    readRecent();
  }, []);

  // Listen for both cross-tab (storage) and same-tab (custom event) updates
  useEffect(() => {
    window.addEventListener("storage", readRecent);
    window.addEventListener(RECENT_UPDATED_EVENT, readRecent);
    return () => {
      window.removeEventListener("storage", readRecent);
      window.removeEventListener(RECENT_UPDATED_EVENT, readRecent);
    };
  }, []);

  if (recent.length === 0) return null;

  return (
    <div className="recent">
      <div className="recent__label">Recent Searches</div>
      <div className="recent__list">
        {recent.map((entry) => (
          <button
            key={entry.cardId}
            className="recent__pill"
            onClick={() =>
              onSelect({
                id: entry.cardId,
                name: entry.name,
                setName: entry.setName,
                number: entry.number,
                rarity: "",
                imageUrl: entry.imageUrl,
              })
            }
          >
            <img className="recent__pill-image" src={entry.imageUrl} alt={entry.name} />
            <span className="recent__pill-name">{entry.name}</span>
            <span className="recent__pill-price">${entry.lastPrice.toFixed(2)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/RecentSearches.tsx
git commit -m "feat: add RecentSearches component with localStorage"
```

### Task 10.6: Wire up the main page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace page with dashboard**

```typescript
// app/page.tsx
"use client";

import { useState, useCallback } from "react";
import { CardSearchResult, PriceResult } from "@/lib/types";
import SearchBar from "@/components/SearchBar";
import CardResult from "@/components/CardResult";
import RecentSearches, { addRecentSearch } from "@/components/RecentSearches";

export default function Home() {
  const [priceData, setPriceData] = useState<PriceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async (cardId: string) => {
    setLoading(true);
    setError(null);
    setPriceData(null); // Clear previous result so skeleton shows
    try {
      const res = await fetch(`/api/prices?cardId=${encodeURIComponent(cardId)}`);
      if (!res.ok) throw new Error("Failed to fetch prices");
      const data: PriceResult = await res.json();
      setPriceData(data);

      addRecentSearch({
        cardId: data.cardId,
        name: data.cardName,
        setName: data.setName,
        number: data.cardNumber,
        imageUrl: data.imageUrl,
        lastPrice: data.superGuess.estimate,
        timestamp: new Date().toISOString(),
      });
    } catch {
      setError("Failed to load pricing data. Please try again.");
      setPriceData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!priceData) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/refresh?cardId=${encodeURIComponent(priceData.cardId)}`);
      const data: PriceResult = await res.json();
      setPriceData(data);
    } catch { /* keep existing data */ } finally {
      setRefreshing(false);
    }
  }, [priceData]);

  const handleCardSelect = useCallback((card: CardSearchResult) => {
    fetchPrices(card.id);
  }, [fetchPrices]);

  return (
    <>
      <header className="header">
        <div className="header__logo">POKEPRICE</div>
        <div className="header__attribution">
          Data from eBay · TCGplayer · PriceCharting
        </div>
      </header>

      <SearchBar onSelect={handleCardSelect} />

      {loading && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
          <div className="result">
            <div className="skeleton" style={{ width: 200, height: 280 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
              <div className="skeleton" style={{ height: 120 }} />
              <div className="skeleton" style={{ height: 64 }} />
              <div className="skeleton" style={{ height: 64 }} />
            </div>
          </div>
        </div>
      )}

      {error && !loading && (
        <div style={{ maxWidth: 600, margin: "32px auto", padding: "24px", textAlign: "center", color: "#e0e0e0", background: "#12121a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
          {error}
        </div>
      )}

      {priceData && !loading && (
        <CardResult data={priceData} onRefresh={handleRefresh} refreshing={refreshing} />
      )}

      <RecentSearches onSelect={handleCardSelect} />
    </>
  );
}
```

- [ ] **Step 2: Verify the app runs**

Run: `npm run dev`
Expected: App loads at localhost:3000 with header, search bar, and Gold Rush theme

- [ ] **Step 3: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire up main dashboard page with all components"
```

### Task 10.7: Final smoke test

- [ ] **Step 1: Start dev server and manually test**

Run: `npm run dev`

Test checklist:
1. Page loads with dark theme and gold accents
2. Search bar accepts input and shows autocomplete after 2+ chars
3. Selecting a card shows price breakdown
4. Refresh button fetches new prices
5. Recent searches appear as pills at bottom

- [ ] **Step 2: Run all tests**

Run: `npx jest`
Expected: All tests pass

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete PokéPrice MVP dashboard"
```
