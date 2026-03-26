# PokéPrice Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Pokemon card price aggregation dashboard that searches cards and shows prices from eBay, TCGplayer, and PriceCharting with a weighted "Super Guess" estimate.

**Architecture:** Next.js App Router with three API routes (search, prices, refresh), three price source adapters fetched in parallel, Vercel KV caching with 4-hour TTL, and a Super Guess weighted algorithm. Client-side: autocomplete search, card result display, and localStorage recent searches.

**Tech Stack:** Next.js 14, TypeScript, Vercel KV, CSS (Gold Rush dark theme), Jest

**Spec:** [2026-03-25-pokeprice-dashboard-design.md](../specs/2026-03-25-pokeprice-dashboard-design.md)

---

## Plan Parts (execute in order)

| Part | File | Summary |
|------|------|---------|
| 1 | [plan-01-scaffold.md](2026-03-25-pokeprice-plan-01-scaffold.md) | Next.js init, deps, env, directory structure |
| 2 | [plan-02-types.md](2026-03-25-pokeprice-plan-02-types.md) | Shared TypeScript interfaces |
| 3 | [plan-03-super-guess.md](2026-03-25-pokeprice-plan-03-super-guess.md) | Weighted price algorithm (TDD) |
| 4 | [plan-04-cache.md](2026-03-25-pokeprice-plan-04-cache.md) | Vercel KV cache layer (TDD) |
| 5 | [plan-05-tcgplayer.md](2026-03-25-pokeprice-plan-05-tcgplayer.md) | TCGplayer adapter via Pokemon TCG API (TDD) |
| 6 | [plan-06-ebay.md](2026-03-25-pokeprice-plan-06-ebay.md) | eBay Browse API adapter with OAuth (TDD) |
| 7 | [plan-07-pricecharting.md](2026-03-25-pokeprice-plan-07-pricecharting.md) | PriceCharting scraping adapter (TDD) |
| 8 | [plan-08-api-routes.md](2026-03-25-pokeprice-plan-08-api-routes.md) | Search, prices, and refresh API routes |
| 9 | [plan-09-theme-layout.md](2026-03-25-pokeprice-plan-09-theme-layout.md) | Gold Rush CSS theme + root layout |
| 10 | [plan-10-components-page.md](2026-03-25-pokeprice-plan-10-components-page.md) | All React components + main page wiring |

## File Map

```
pokeprice/
├── app/
│   ├── layout.tsx              # Part 9  — Root layout + metadata
│   ├── page.tsx                # Part 10 — Main dashboard (client component)
│   ├── globals.css             # Part 9  — Gold Rush dark theme
│   └── api/
│       ├── search/route.ts     # Part 8  — Card search proxy
│       ├── prices/route.ts     # Part 8  — Aggregated prices + cache
│       └── refresh/route.ts    # Part 8  — Cache bypass refresh
├── lib/
│   ├── types.ts                # Part 2  — Shared interfaces
│   ├── super-guess.ts          # Part 3  — Weighted price algorithm
│   ├── cache.ts                # Part 4  — Vercel KV abstraction
│   ├── source-summary.ts       # Part 8  — Shared source summary builder
│   ├── __tests__/
│   │   ├── super-guess.test.ts # Part 3
│   │   └── cache.test.ts       # Part 4
│   └── sources/
│       ├── tcgplayer.ts        # Part 5  — TCGplayer adapter
│       ├── ebay.ts             # Part 6  — eBay adapter
│       ├── pricecharting.ts    # Part 7  — PriceCharting adapter
│       └── __tests__/
│           ├── tcgplayer.test.ts    # Part 5
│           ├── ebay.test.ts         # Part 6
│           └── pricecharting.test.ts # Part 7
├── components/
│   ├── SearchBar.tsx           # Part 10 — Autocomplete search
│   ├── CardResult.tsx          # Part 10 — Card image + price panel
│   ├── PriceSource.tsx         # Part 10 — Individual source row
│   ├── SuperGuess.tsx          # Part 10 — Highlighted estimate
│   └── RecentSearches.tsx      # Part 10 — localStorage recent pills
├── jest.config.ts              # Part 3  — Test configuration
├── .env.example                # Part 1  — Env var template
└── .gitignore                  # Part 1  — Already exists
```
