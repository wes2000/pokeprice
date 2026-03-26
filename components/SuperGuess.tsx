// components/SuperGuess.tsx
"use client";

import { SuperGuessResult } from "@/lib/types";

interface SuperGuessProps {
  data: SuperGuessResult;
  onRefresh: () => void;
  refreshing: boolean;
}

export default function SuperGuess({ data, onRefresh, refreshing }: SuperGuessProps) {
  return (
    <div className="super-guess">
      <div className="super-guess__label">Super Guess Estimate</div>
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
