// components/PriceChart.tsx
"use client";

import { PriceHistoryPoint } from "@/lib/types";

interface PriceChartProps {
  data: PriceHistoryPoint[];
}

export default function PriceChart({ data }: PriceChartProps) {
  if (data.length < 2) return null;

  // Take last 90 days of data for a clean chart
  const recent = data.slice(-90);
  const prices = recent.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const width = 400;
  const height = 80;
  const padX = 0;
  const padY = 4;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = recent.map((p, i) => {
    const x = padX + (i / (recent.length - 1)) * chartW;
    const y = padY + chartH - ((p.price - min) / range) * chartH;
    return `${x},${y}`;
  });

  const polyline = points.join(" ");

  // Fill area under the line
  const areaPoints = `${padX},${height} ${polyline} ${width},${height}`;

  const firstPrice = recent[0].price;
  const lastPrice = recent[recent.length - 1].price;
  const trend = lastPrice >= firstPrice ? "up" : "down";
  const strokeColor = trend === "up" ? "#22c55e" : "#ef4444";
  const fillColor = trend === "up" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)";

  const pctChange = ((lastPrice - firstPrice) / firstPrice) * 100;
  const firstDate = recent[0].date;
  const lastDate = recent[recent.length - 1].date;

  return (
    <div className="price-chart">
      <div className="price-chart__header">
        <span className="price-chart__title">Price Trend</span>
        <span className={`price-chart__change price-chart__change--${trend}`}>
          {trend === "up" ? "+" : ""}{pctChange.toFixed(1)}%
        </span>
      </div>
      <svg
        className="price-chart__svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <polygon points={areaPoints} fill={fillColor} />
        <polyline
          points={polyline}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="price-chart__labels">
        <span>{firstDate}</span>
        <span>${min.toFixed(2)} – ${max.toFixed(2)}</span>
        <span>{lastDate}</span>
      </div>
    </div>
  );
}
