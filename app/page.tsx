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
