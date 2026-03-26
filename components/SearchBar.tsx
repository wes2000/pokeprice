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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
