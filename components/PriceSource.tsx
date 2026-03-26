// components/PriceSource.tsx
"use client";

import { useState } from "react";
import { PriceEntry } from "@/lib/types";

interface PriceSourceProps {
  name: string;
  meta: string;
  price: string;
  url?: string;
  listings?: PriceEntry[];
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function PriceSource({ name, meta, price, url, listings }: PriceSourceProps) {
  const [expanded, setExpanded] = useState(false);

  // For the dropdown, only show sold listings for PriceCharting; show all for eBay/TCGplayer
  // Market-type entries (summary prices) are excluded from the expandable list
  const expandableListings = listings?.filter((l) => l.type !== "market") || [];
  const hasListings = expandableListings.length > 0;

  // Also show market entries if that's all we have (TCGplayer variants)
  const displayListings = hasListings
    ? expandableListings
    : (listings?.length ?? 0) > 1 ? listings! : [];
  const hasExpandable = displayListings.length > 0;

  return (
    <div
      className={`price-source ${hasExpandable ? "price-source--expandable" : ""} ${expanded ? "price-source--expanded" : ""}`}
      onClick={hasExpandable ? () => setExpanded(!expanded) : undefined}
    >
      <div className="price-source__header">
        <div>
          <div className="price-source__name-row">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="price-source__name price-source__name--link"
                onClick={(e) => e.stopPropagation()}
              >
                {name} ↗
              </a>
            ) : (
              <span className="price-source__name">{name}</span>
            )}
            {hasExpandable && (
              <span className="price-source__chevron">{expanded ? "▾" : "▸"}</span>
            )}
          </div>
          <div className="price-source__meta">{meta}</div>
        </div>
        <div>
          <span className="price-source__price">{price}</span>
        </div>
      </div>

      {expanded && hasExpandable && (
        <div className="price-source__listings" onClick={(e) => e.stopPropagation()}>
          {displayListings.slice(0, 15).map((item, i) => (
            <div key={i} className={`price-source__listing-row ${item.type === "sold" ? "price-source__listing-row--sold" : ""}`}>
              <div className="price-source__listing-info">
                <span className={`price-source__listing-badge price-source__listing-badge--${item.type}`}>
                  {item.type === "sold" ? "SOLD" : item.type === "market" ? "MKT" : "LISTED"}
                </span>
                <span className="price-source__listing-condition">{item.condition}</span>
                {item.type === "sold" && item.date && (
                  <span className="price-source__listing-date">{formatDate(item.date)}</span>
                )}
              </div>
              <div className="price-source__listing-right">
                <span className="price-source__listing-price">${item.price.toFixed(2)}</span>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="price-source__listing-link"
                  >
                    View ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
