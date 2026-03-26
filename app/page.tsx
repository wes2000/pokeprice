// app/page.tsx
"use client";

import { useState, useCallback } from "react";
import { CardSearchResult, PriceResult } from "@/lib/types";
import SearchBar from "@/components/SearchBar";
import CardResult from "@/components/CardResult";
import RecentSearches, { addRecentSearch } from "@/components/RecentSearches";
import SetBrowser from "@/components/SetBrowser";
import PopularSets from "@/components/PopularSets";

type View = "home" | "card" | "set";

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [priceData, setPriceData] = useState<PriceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);

  const fetchPrices = useCallback(async (cardId: string) => {
    setView("card");
    setLoading(true);
    setError(null);
    setPriceData(null);
    setActiveSetId(null);
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

  const handleSetSelect = useCallback((setId: string) => {
    setView("set");
    setActiveSetId(setId);
    setPriceData(null);
    setError(null);
  }, []);

  const handleBack = useCallback(() => {
    setView("home");
    setActiveSetId(null);
    setPriceData(null);
    setError(null);
  }, []);

  return (
    <>
      <header className="header">
        <button className="header__logo" onClick={handleBack} style={{ background: "none", border: "none", cursor: "pointer" }}>
          POKEPRICE
        </button>
        <div className="header__attribution">
          Data from eBay · TCGplayer · PriceCharting
        </div>
      </header>

      <SearchBar onSelect={handleCardSelect} onSetSelect={handleSetSelect} />

      {view === "set" && activeSetId && (
        <SetBrowser setId={activeSetId} onCardSelect={handleCardSelect} onBack={handleBack} />
      )}

      {view === "card" && loading && (
        <div className="result-wrapper">
          <div className="result-heading">
            <div className="skeleton" style={{ height: 36, width: 240, margin: "0 auto", borderRadius: 8 }} />
            <div className="skeleton" style={{ height: 16, width: 180, margin: "8px auto 0", borderRadius: 4 }} />
          </div>
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

      {view === "card" && error && !loading && (
        <div style={{ maxWidth: 600, margin: "32px auto", padding: "24px", textAlign: "center", color: "#e0e0e0", background: "#12121a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
          {error}
        </div>
      )}

      {view === "card" && priceData && !loading && (
        <CardResult data={priceData} onRefresh={handleRefresh} refreshing={refreshing} />
      )}

      {view === "home" && (
        <>
          <PopularSets onSetSelect={handleSetSelect} />
          <RecentSearches onSelect={handleCardSelect} />
        </>
      )}
    </>
  );
}
