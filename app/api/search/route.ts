import { NextRequest, NextResponse } from "next/server";
import { CardSearchResult } from "@/lib/types";

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2/cards";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const sanitized = q.replace(/["']/g, "");
    const res = await fetch(
      `${POKEMON_TCG_API}?q=name:"${encodeURIComponent(sanitized)}*"&pageSize=8&select=id,name,set,number,rarity,images`,
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
