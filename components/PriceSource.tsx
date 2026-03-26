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

export default function PriceSource({ name, meta, price, url, listings }: PriceSourceProps) {
  const [expanded, setExpanded] = useState(false);
  const hasListings = listings && listings.length > 0;

  return (
    <div
      className={`price-source ${hasListings ? "price-source--expandable" : ""} ${expanded ? "price-source--expanded" : ""}`}
      onClick={hasListings ? () => setExpanded(!expanded) : undefined}
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
            {hasListings && (
              <span className="price-source__chevron">{expanded ? "▾" : "▸"}</span>
            )}
          </div>
          <div className="price-source__meta">{meta}</div>
        </div>
        <div>
          <span className="price-source__price">{price}</span>
        </div>
      </div>

      {expanded && hasListings && (
        <div className="price-source__listings" onClick={(e) => e.stopPropagation()}>
          {listings.slice(0, 10).map((item, i) => (
            <div key={i} className="price-source__listing-row">
              <div className="price-source__listing-info">
                <span className="price-source__listing-condition">{item.condition}</span>
                <span className="price-source__listing-type">{item.type}</span>
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
