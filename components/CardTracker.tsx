// components/CardTracker.tsx
"use client";

import { useEffect, useState } from "react";

export interface TrackedCard {
  cardId: string;
  name: string;
  setName: string;
  number: string;
  rarity: string;
  price: number;
  imageUrl: string;
  tcgplayerUrl?: string;
  pricechartingUrl?: string;
}

const STORAGE_KEY = "pokeprice-tracker";
const TRACKER_EVENT = "pokeprice-tracker-updated";

export function addTrackedCard(card: TrackedCard) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as TrackedCard[];
    const updated = [...stored, card];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(TRACKER_EVENT));
  } catch {}
}

function todayDate(): string {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export function formatCardRow(card: TrackedCard): string {
  return [
    card.setName,
    card.name,
    todayDate(),
    `$${card.price.toFixed(2)}`,
    `=IMAGE("${card.imageUrl}")`,
    `${card.name} - ${card.number}`,
    card.rarity,
    card.tcgplayerUrl ? `=HYPERLINK("${card.tcgplayerUrl}","TCGPlayer Link")` : "",
    card.pricechartingUrl ? `=HYPERLINK("${card.pricechartingUrl}","PriceCharting Link")` : "",
  ].join("\t");
}

export function copyCardToClipboard(card: TrackedCard) {
  navigator.clipboard.writeText(formatCardRow(card));
}

interface CardTrackerProps {
  onCardClick?: (cardId: string) => void;
}

export default function CardTracker({ onCardClick }: CardTrackerProps) {
  const [cards, setCards] = useState<TrackedCard[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hoverCard, setHoverCard] = useState<TrackedCard | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  function readCards() {
    try {
      setCards(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch {}
  }

  useEffect(() => {
    readCards();
    const handler = () => readCards();
    window.addEventListener(TRACKER_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(TRACKER_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const total = cards.reduce((sum, c) => sum + c.price, 0);

  function handleExport() {
    const rows = cards.map(formatCardRow);
    const text = rows.join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    localStorage.setItem(STORAGE_KEY, "[]");
    setCards([]);
    setConfirmClear(false);
    window.dispatchEvent(new Event(TRACKER_EVENT));
  }

  function removeCard(cardId: string) {
    const updated = cards.filter((c) => c.cardId !== cardId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setCards(updated);
    window.dispatchEvent(new Event(TRACKER_EVENT));
  }

  function handleMouseEnter(card: TrackedCard, e: React.MouseEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setHoverCard(card);
    setHoverPos({ x: rect.left, y: rect.top });
  }

  if (cards.length === 0) {
    return (
      <div className="tracker">
        <div className="tracker__title">Card Tracker</div>
        <div className="tracker__empty">
          Add cards to track their value
        </div>
      </div>
    );
  }

  return (
    <div className="tracker">
      <div className="tracker__header">
        <div className="tracker__title">Card Tracker</div>
        <div className="tracker__total">
          <span className="tracker__total-label">{cards.length} cards</span>
          <span className="tracker__total-price">${total.toFixed(2)}</span>
        </div>
      </div>

      <div className="tracker__list">
        {cards.map((card) => (
          <div key={card.cardId} className="tracker__card">
            <img className="tracker__card-image" src={card.imageUrl} alt={card.name} />
            <div className="tracker__card-info">
              <span
                className="tracker__card-name"
                onMouseEnter={(e) => handleMouseEnter(card, e)}
                onMouseLeave={() => setHoverCard(null)}
                onClick={() => onCardClick?.(card.cardId)}
              >
                {card.name}
              </span>
              <span className="tracker__card-meta">{card.setName} · {card.number}</span>
              <span className="tracker__card-rarity">{card.rarity}</span>
            </div>
            <div className="tracker__card-right">
              <span className="tracker__card-price">${card.price.toFixed(2)}</span>
              <button
                className="tracker__card-remove"
                onClick={() => removeCard(card.cardId)}
                title="Remove"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="tracker__actions">
        <button className="tracker__btn tracker__btn--export" onClick={handleExport}>
          {copied ? "Copied!" : "Export"}
        </button>
        <button
          className={`tracker__btn tracker__btn--clear ${confirmClear ? "tracker__btn--confirm" : ""}`}
          onClick={handleClear}
          onBlur={() => setConfirmClear(false)}
        >
          {confirmClear ? "Are you sure?" : "Clear"}
        </button>
      </div>

      {hoverCard && (
        <div
          className="tracker__hover-preview"
          style={{ top: hoverPos.y < 240 ? hoverPos.y + 30 : hoverPos.y - 220, left: hoverPos.x - 160 }}
        >
          <img src={hoverCard.imageUrl} alt={hoverCard.name} />
        </div>
      )}
    </div>
  );
}
