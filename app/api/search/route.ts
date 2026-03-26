import { NextRequest, NextResponse } from "next/server";
import { CardSearchResult } from "@/lib/types";

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2";

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

  const escaped = remaining.replace(/"/g, "");
  const nameQuery = `name:"${escaped}*"`;
  const setQuery = `set.name:"${escaped}*"`;

  if (parts.length > 0) {
    parts.unshift(`(${nameQuery} OR ${setQuery})`);
  } else {
    parts.push(`(${nameQuery} OR ${setQuery})`);
  }

  return parts.join(" ");
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], sets: [] });
  }

  try {
    const query = buildSearchQuery(q);

    // Search cards and sets in parallel
    const [cardsRes, setsRes] = await Promise.all([
      fetch(
        `${POKEMON_TCG_API}/cards?q=${encodeURIComponent(query)}&pageSize=8&select=id,name,set,number,rarity,images`,
        { next: { revalidate: 60 } } as RequestInit
      ),
      fetch(
        `${POKEMON_TCG_API}/sets?q=name:"${encodeURIComponent(q.trim().replace(/"/g, ""))}*"&orderBy=-releaseDate&pageSize=5`,
        { next: { revalidate: 60 } } as RequestInit
      ),
    ]);

    const results: CardSearchResult[] = [];
    if (cardsRes.ok) {
      const data = await cardsRes.json();
      for (const card of data.data || []) {
        results.push({
          id: card.id,
          name: card.name,
          setName: (card.set as { name: string })?.name || "",
          number: `${card.number}/${(card.set as { printedTotal: number })?.printedTotal || "?"}`,
          rarity: (card.rarity as string) || "Unknown",
          imageUrl: (card.images as { small: string })?.small || "",
        });
      }
    }

    const sets: { id: string; name: string; series: string; releaseDate: string; total: number; logoUrl: string }[] = [];
    if (setsRes.ok) {
      const setsData = await setsRes.json();
      for (const s of setsData.data || []) {
        sets.push({
          id: s.id,
          name: s.name,
          series: s.series,
          releaseDate: s.releaseDate,
          total: s.printedTotal || s.total,
          logoUrl: s.images?.logo || "",
        });
      }
    }

    return NextResponse.json({ results, sets });
  } catch {
    return NextResponse.json({ results: [], sets: [] }, { status: 500 });
  }
}
