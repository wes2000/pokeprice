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
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="price-source__name" style={{ color: "#f59e0b", textDecoration: "none" }}>
            {name} ↗
          </a>
        ) : (
          <div className="price-source__name">{name}</div>
        )}
        <div className="price-source__meta">{meta}</div>
      </div>
      <div>
        <span className="price-source__price">{price}</span>
      </div>
    </div>
  );
}
