// components/SuperGuess.tsx
"use client";

import { useState } from "react";
import { SuperGuessResult } from "@/lib/types";

interface SuperGuessProps {
  data: SuperGuessResult;
  onRefresh: () => void;
  refreshing: boolean;
}

export default function SuperGuess({ data, onRefresh, refreshing }: SuperGuessProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="super-guess">
      <div className="super-guess__label-row">
        <span className="super-guess__label">Super Guess Estimate</span>
        <span
          className="super-guess__info-icon"
          onMouseEnter={() => setShowInfo(true)}
          onMouseLeave={() => setShowInfo(false)}
        >
          &#9432;
          {showInfo && (
            <div className="super-guess__tooltip">
              Weighted average across all sources. Sold prices count 3×, market prices 1×, and active listings 0.5×. Recent prices are weighted higher, and statistical outliers are removed for accuracy.
            </div>
          )}
        </span>
      </div>
      <div className="super-guess__price">${data.estimate.toFixed(2)}</div>
      <div className="super-guess__meta">
        <span className={`super-guess__confidence super-guess__confidence--${data.confidence}`}>
          {data.confidence} confidence
        </span>
        <span>{data.dataPoints} data points</span>
        <button className="super-guess__refresh" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Refreshing..." : "Refresh prices"}
        </button>
      </div>
    </div>
  );
}
