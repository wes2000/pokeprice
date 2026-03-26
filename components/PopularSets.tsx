// components/PopularSets.tsx
"use client";

interface PopularSetsProps {
  onSetSelect: (setId: string) => void;
}

const POPULAR_SETS = [
  { id: "sv8pt5", name: "Prismatic Evolutions" },
  { id: "me2", name: "Phantasmal Flames" },
  { id: "sv10", name: "Destined Rivals" },
  { id: "sv8", name: "Surging Sparks" },
  { id: "sv3pt5", name: "Scarlet & Violet—151" },
];

export default function PopularSets({ onSetSelect }: PopularSetsProps) {
  return (
    <div className="popular-sets">
      <div className="popular-sets__label">Popular Sets</div>
      <div className="popular-sets__list">
        {POPULAR_SETS.map((set) => (
          <button
            key={set.id}
            className="popular-sets__pill"
            onClick={() => onSetSelect(set.id)}
          >
            {set.name}
          </button>
        ))}
      </div>
    </div>
  );
}
