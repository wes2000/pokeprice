# PokéPrice Implementation Plan — Part 9: Gold Rush Theme & Layout

**Goal:** Implement the Gold Rush dark theme CSS and root layout.

---

### Task 9.1: Create Gold Rush globals.css

**Files:**
- Modify: `app/globals.css` (replace default Next.js styles)

- [ ] **Step 1: Write the Gold Rush theme**

Replace entire contents of `app/globals.css`:

```css
/* Gold Rush Dark Theme */
:root {
  --bg: #0a0a0f;
  --surface: #12121a;
  --border-gold: rgba(245, 158, 11, 0.3);
  --border-gold-bright: rgba(245, 158, 11, 0.6);
  --primary: #f59e0b;
  --highlight: #fbbf24;
  --text: #e0e0e0;
  --text-muted: #666666;
  --success: #22c55e;
  --gradient-gold: linear-gradient(90deg, #f59e0b, #fbbf24, transparent);
  --font-mono: "SF Mono", "Fira Code", "Fira Mono", Menlo, monospace;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-gold);
}

.header__logo {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--primary);
  letter-spacing: 2px;
}

.header__attribution {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Search */
.search {
  max-width: 600px;
  margin: 48px auto 32px;
  padding: 0 24px;
  position: relative;
}

.search__label {
  display: block;
  font-size: 0.7rem;
  letter-spacing: 3px;
  color: var(--text-muted);
  margin-bottom: 8px;
  text-transform: uppercase;
}

.search__input {
  width: 100%;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--border-gold);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.search__input:focus {
  border-color: var(--border-gold-bright);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
}

.search__dropdown {
  position: absolute;
  top: 100%;
  left: 24px;
  right: 24px;
  background: var(--surface);
  border: 1px solid var(--border-gold);
  border-radius: 0 0 8px 8px;
  border-top: none;
  max-height: 400px;
  overflow-y: auto;
  z-index: 10;
}

.search__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.search__item:hover,
.search__item--active {
  background: rgba(245, 158, 11, 0.08);
}

.search__item-image {
  width: 36px;
  height: 50px;
  object-fit: contain;
  border-radius: 3px;
}

.search__item-name {
  font-weight: 600;
  color: var(--text);
}

.search__item-meta {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Result */
.result {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 24px 64px;
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 32px;
}

.result__image {
  width: 200px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.result__prices {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Super Guess card */
.super-guess {
  background: var(--surface);
  border: 1px solid var(--border-gold-bright);
  border-radius: 12px;
  padding: 24px;
}

.super-guess__label {
  font-size: 0.7rem;
  letter-spacing: 2px;
  color: var(--primary);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.super-guess__price {
  font-size: 2.5rem;
  font-weight: 800;
  font-family: var(--font-mono);
  color: var(--highlight);
}

.super-guess__meta {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.super-guess__confidence {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.super-guess__confidence--high {
  background: rgba(34, 197, 94, 0.15);
  color: var(--success);
}

.super-guess__confidence--medium {
  background: rgba(245, 158, 11, 0.15);
  color: var(--primary);
}

.super-guess__confidence--low {
  background: rgba(102, 102, 102, 0.15);
  color: var(--text-muted);
}

.super-guess__refresh {
  color: var(--primary);
  cursor: pointer;
  text-decoration: underline;
  background: none;
  border: none;
  font-size: 0.8rem;
}

/* Price source rows */
.price-source {
  background: var(--surface);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-source__name {
  font-weight: 600;
  color: var(--text);
}

.price-source__meta {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.price-source__price {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text);
}

/* Recent searches */
.recent {
  max-width: 900px;
  margin: 32px auto 0;
  padding: 0 24px 48px;
}

.recent__label {
  font-size: 0.7rem;
  letter-spacing: 2px;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 12px;
}

.recent__list {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.recent__pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--surface);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.2s;
}

.recent__pill:hover {
  border-color: var(--border-gold);
}

.recent__pill-image {
  width: 24px;
  height: 33px;
  object-fit: contain;
  border-radius: 2px;
}

.recent__pill-name {
  font-size: 0.8rem;
  color: var(--text);
}

.recent__pill-price {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--primary);
}

/* Skeleton loading */
.skeleton {
  background: linear-gradient(90deg, var(--surface) 25%, rgba(255, 255, 255, 0.04) 50%, var(--surface) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Responsive */
@media (max-width: 640px) {
  .result {
    grid-template-columns: 1fr;
    justify-items: center;
  }
}
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev` and open localhost:3000. Background should be near-black.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: implement Gold Rush dark theme"
```

### Task 9.2: Update root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace layout with PokéPrice metadata**

```typescript
// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PokéPrice — Pokemon Card Price Dashboard",
  description: "Search any Pokemon card and see aggregated prices from eBay, TCGplayer, and PriceCharting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: update root layout with PokéPrice metadata"
```
