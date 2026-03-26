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
