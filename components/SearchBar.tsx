// components/SearchBar.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { CardSearchResult } from "@/lib/types";

interface SetResult {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  total: number;
  logoUrl: string;
}

interface SearchBarProps {
  onSelect: (card: CardSearchResult) => void;
  onSetSelect?: (setId: string) => void;
}

export default function SearchBar({ onSelect, onSetSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardSearchResult[]>([]);
  const [sets, setSets] = useState<SetResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalItems = sets.length + results.length;

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setSets([]);
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
        setSets(data.sets || []);
        setOpen((data.results?.length > 0) || (data.sets?.length > 0));
        setActiveIndex(-1);
      } catch {
        setResults([]);
        setSets([]);
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
      setActiveIndex((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      if (activeIndex < sets.length) {
        selectSet(sets[activeIndex]);
      } else {
        selectCard(results[activeIndex - sets.length]);
      }
    }
  }

  function selectCard(card: CardSearchResult) {
    setQuery(card.name);
    setOpen(false);
    onSelect(card);
  }

  function selectSet(set: SetResult) {
    setQuery(set.name);
    setOpen(false);
    onSetSelect?.(set.id);
  }

  return (
    <div className="search" ref={containerRef}>
      <label className="search__label">Search Any Card or Set</label>
      <input
        className="search__input"
        type="text"
        placeholder="Charizard, Base Set 4/102, Prismatic Evolutions..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => totalItems > 0 && setOpen(true)}
      />
      {loading && (
        <div style={{ position: "absolute", right: 40, top: "50%", color: "#666", fontSize: "0.8rem" }}>
          Searching...
        </div>
      )}
      {open && (
        <div className="search__dropdown">
          {sets.length > 0 && (
            <>
              <div className="search__section-label">Sets</div>
              {sets.map((set, i) => (
                <div
                  key={`set-${set.id}`}
                  className={`search__item search__item--set ${i === activeIndex ? "search__item--active" : ""}`}
                  onClick={() => selectSet(set)}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  {set.logoUrl && (
                    <img className="search__set-logo" src={set.logoUrl} alt={set.name} />
                  )}
                  <div>
                    <div className="search__item-name">{set.name}</div>
                    <div className="search__item-meta">{set.series} · {set.total} cards · {set.releaseDate}</div>
                  </div>
                </div>
              ))}
            </>
          )}
          {results.length > 0 && (
            <>
              {sets.length > 0 && <div className="search__section-label">Cards</div>}
              {results.map((card, i) => (
                <div
                  key={card.id}
                  className={`search__item ${i + sets.length === activeIndex ? "search__item--active" : ""}`}
                  onClick={() => selectCard(card)}
                  onMouseEnter={() => setActiveIndex(i + sets.length)}
                >
                  <img className="search__item-image" src={card.imageUrl} alt={card.name} />
                  <div>
                    <div className="search__item-name">{card.name}</div>
                    <div className="search__item-meta">{card.setName} · {card.number} · {card.rarity}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
