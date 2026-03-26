// components/CardResult.tsx
"use client";

import { useState } from "react";
import { PriceResult } from "@/lib/types";
import SuperGuess from "./SuperGuess";
import PriceSource from "./PriceSource";
import PriceChart from "./PriceChart";
import { addTrackedCard, copyCardToClipboard } from "./CardTracker";

interface CardResultProps {
  data: PriceResult;
  onRefresh: () => void;
  refreshing: boolean;
}

export default function CardResult({ data, onRefresh, refreshing }: CardResultProps) {
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [trackFeedback, setTrackFeedback] = useState(false);

  const ebayUrl = data.prices.find((p) => p.source === "ebay")?.url;
  const tcgplayerUrl = data.prices.find((p) => p.source === "tcgplayer")?.url;
  const pricechartingUrl = data.prices.find((p) => p.source === "pricecharting")?.url;

  const ebayListings = data.prices.filter((p) => p.source === "ebay");
  const tcgplayerListings = data.prices.filter((p) => p.source === "tcgplayer");
  const pricechartingListings = data.prices.filter((p) => p.source === "pricecharting");

  function handleCopy() {
    copyCardToClipboard({
      cardId: data.cardId,
      name: data.cardName,
      setName: data.setName,
      number: data.cardNumber,
      rarity: data.rarity,
      price: data.superGuess.estimate,
      imageUrl: data.imageUrl,
    });
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 1500);
  }

  function handleTrack() {
    addTrackedCard({
      cardId: data.cardId,
      name: data.cardName,
      setName: data.setName,
      number: data.cardNumber,
      rarity: data.rarity,
      price: data.superGuess.estimate,
      imageUrl: data.imageUrl,
    });
    setTrackFeedback(true);
    setTimeout(() => setTrackFeedback(false), 1500);
  }

  return (
    <div className="result-wrapper">
      <div className="result-heading">
        <h1 className="result-heading__name">{data.cardName}</h1>
        <div className="result-heading__meta">{data.setName} · {data.cardNumber} · {data.rarity}</div>
      </div>
      <div className="result">
        <div className="result__left">
          <img className="result__image" src={data.imageUrl} alt={data.cardName} />
          <div className="result__card-actions">
            <button className="result__action-btn" onClick={handleCopy}>
              {copyFeedback ? "Copied!" : "Copy"}
            </button>
            <button className="result__action-btn result__action-btn--track" onClick={handleTrack}>
              {trackFeedback ? "Added!" : "+ Track"}
            </button>
          </div>
        </div>
        <div className="result__prices">
          <SuperGuess data={data.superGuess} onRefresh={onRefresh} refreshing={refreshing} />

          {data.priceHistory && data.priceHistory.length >= 2 && (
            <PriceChart data={data.priceHistory} />
          )}

          {data.sources.ebay && (
            <PriceSource
              name="eBay"
              meta={`${data.sources.ebay.count} listings`}
              price={`$${data.sources.ebay.avg.toFixed(2)} avg ($${data.sources.ebay.low.toFixed(2)} – $${data.sources.ebay.high.toFixed(2)})`}
              url={ebayUrl}
              listings={ebayListings}
            />
          )}

          {data.sources.tcgplayer && (
            <PriceSource
              name="TCGplayer"
              meta="Market price"
              price={`$${data.sources.tcgplayer.market.toFixed(2)} ($${data.sources.tcgplayer.low.toFixed(2)} – $${data.sources.tcgplayer.high.toFixed(2)})`}
              url={tcgplayerUrl}
              listings={tcgplayerListings}
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
              url={pricechartingUrl}
              listings={pricechartingListings}
            />
          )}

          {!data.sources.ebay && !data.sources.tcgplayer && !data.sources.pricecharting && (
            <div style={{ color: "#666", textAlign: "center", padding: 32 }}>
              No pricing data found. Try checking the card name.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
