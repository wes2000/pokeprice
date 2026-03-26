// components/SetBrowser.tsx
"use client";

import { useState, useEffect } from "react";
import { SetInfo, SetCardEntry, CardSearchResult } from "@/lib/types";

interface SetBrowserProps {
  setId: string;
  onCardSelect: (card: CardSearchResult) => void;
  onBack: () => void;
}

export default function SetBrowser({ setId, onCardSelect, onBack }: SetBrowserProps) {
  const [setInfo, setSetInfo] = useState<SetInfo | null>(null);
  const [cards, setCards] = useState<SetCardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/set?setId=${encodeURIComponent(setId)}`)
      .then((r) => r.json())
      .then((data) => {
        setSetInfo(data.set);
        setCards(data.cards || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setId]);

  if (loading) {
    return (
      <div className="set-browser">
        <div className="set-browser__header">
          <button className="set-browser__back" onClick={onBack}>← Back</button>
        </div>
        <div className="set-browser__grid">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="set-card skeleton" style={{ height: 200 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!setInfo) {
    return (
      <div className="set-browser">
        <button className="set-browser__back" onClick={onBack}>← Back</button>
        <div style={{ textAlign: "center", padding: 48, color: "#666" }}>
          Set not found.
        </div>
      </div>
    );
  }

  return (
    <div className="set-browser">
      <div className="set-browser__header">
        <button className="set-browser__back" onClick={onBack}>← Back</button>
        <div className="set-browser__info">
          {setInfo.logoUrl && (
            <img className="set-browser__logo" src={setInfo.logoUrl} alt={setInfo.name} />
          )}
          <div>
            <h2 className="set-browser__name">{setInfo.name}</h2>
            <div className="set-browser__meta">
              {setInfo.series} · {setInfo.total} cards · {setInfo.releaseDate}
            </div>
          </div>
        </div>
      </div>

      <div className="set-browser__grid">
        {cards.map((card) => (
          <button
            key={card.id}
            className="set-card"
            onClick={() =>
              onCardSelect({
                id: card.id,
                name: card.name,
                setName: setInfo.name,
                number: card.number,
                rarity: card.rarity,
                imageUrl: card.imageUrl,
              })
            }
          >
            <img className="set-card__image" src={card.imageUrl} alt={card.name} />
            <div className="set-card__footer">
              <div className="set-card__name">#{card.number} – {card.name}</div>
              {card.superGuessEstimate != null && (
                <div className="set-card__price">${card.superGuessEstimate.toFixed(2)}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
