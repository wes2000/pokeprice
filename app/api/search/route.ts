import { NextRequest, NextResponse } from "next/server";
import { CardSearchResult } from "@/lib/types";

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2/cards";

function buildSearchQuery(raw: string): string {
  const parts: string[] = [];
  let remaining = raw.trim();

  // Extract card number pattern (e.g., "193/182", "4/102")
  const numberMatch = remaining.match(/(\d+\/\d+)/);
  if (numberMatch) {
    const num = numberMatch[1].split("/")[0];
    parts.push(`number:${num}`);
    remaining = remaining.replace(numberMatch[0], "").trim();
  }

  if (!remaining) {
    return parts.join(" ");
  }

  // Search both name and set.name — the API will match whichever fits
  // Use OR so "Base Set" matches the set, "Charizard" matches the name
  const escaped = remaining.replace(/"/g, "");
  const nameQuery = `name:"${escaped}*"`;
  const setQuery = `set.name:"${escaped}*"`;

  if (parts.length > 0) {
    // If we have a number, try name + number first, fall back to set + number
    parts.unshift(`(${nameQuery} OR ${setQuery})`);
  } else {
    // No number — search both name and set
    parts.push(`(${nameQuery} OR ${setQuery})`);
  }

  return parts.join(" ");
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const query = buildSearchQuery(q);
    const res = await fetch(
      `${POKEMON_TCG_API}?q=${encodeURIComponent(query)}&pageSize=8&select=id,name,set,number,rarity,images`,
      { next: { revalidate: 60 } } as RequestInit
    );

    if (!res.ok) {
      return NextResponse.json({ results: [] }, { status: 502 });
    }

    const data = await res.json();
    const results: CardSearchResult[] = (data.data || []).map(
      (card: Record<string, unknown>) => ({
        id: card.id,
        name: card.name,
        setName: (card.set as { name: string })?.name || "",
        number: `${card.number}/${(card.set as { printedTotal: number })?.printedTotal || "?"}`,
        rarity: (card.rarity as string) || "Unknown",
        imageUrl: (card.images as { small: string })?.small || "",
      })
    );

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
