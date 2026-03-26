// components/PriceSource.tsx
"use client";

interface PriceSourceProps {
  name: string;
  meta: string;
  price: string;
  url?: string;
}

export default function PriceSource({ name, meta, price, url }: PriceSourceProps) {
  return (
    <div className="price-source">
      <div>
        <div className="price-source__name">{name}</div>
        <div className="price-source__meta">{meta}</div>
      </div>
      <div>
        <span className="price-source__price">{price}</span>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, fontSize: "0.75rem", color: "#f59e0b" }}>
            View →
          </a>
        )}
      </div>
    </div>
  );
}
