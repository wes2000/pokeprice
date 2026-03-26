import { NextRequest, NextResponse } from "next/server";
import { getCachedSet, setCachedSet } from "@/lib/cache";

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2";

export async function GET(req: NextRequest) {
  const setId = req.nextUrl.searchParams.get("setId");
  if (!setId) {
    return NextResponse.json({ error: "setId required" }, { status: 400 });
  }

  // Check cache first
  const cached = await getCachedSet<{ set: unknown; cards: unknown[] }>(setId);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const [setRes, cardsRes] = await Promise.all([
      fetch(`${POKEMON_TCG_API}/sets/${setId}`),
      fetch(
        `${POKEMON_TCG_API}/cards?q=set.id:${setId}&orderBy=number&pageSize=250&select=id,name,number,rarity,images,tcgplayer`
      ),
    ]);

    if (!setRes.ok || !cardsRes.ok) {
      return NextResponse.json({ error: "Failed to fetch set" }, { status: 502 });
    }

    const setData = await setRes.json();
    const cardsData = await cardsRes.json();

    const set = setData.data;
    const setInfo = {
      id: set.id,
      name: set.name,
      series: set.series,
      releaseDate: set.releaseDate,
      total: set.printedTotal || set.total,
      logoUrl: set.images?.logo || "",
      symbolUrl: set.images?.symbol || "",
    };

    const cards = (cardsData.data || []).map((card: Record<string, unknown>) => {
      let estimate: number | undefined;
      const tcg = card.tcgplayer as { prices?: Record<string, { market?: number }> } | undefined;
      if (tcg?.prices) {
        const variants = Object.values(tcg.prices);
        const markets = variants.map((v) => v.market).filter((m): m is number => m != null);
        if (markets.length > 0) {
          estimate = Math.round(markets[0] * 100) / 100;
        }
      }

      return {
        id: card.id,
        name: card.name,
        number: card.number,
        imageUrl: (card.images as { small: string })?.small || "",
        rarity: (card.rarity as string) || "Unknown",
        superGuessEstimate: estimate,
      };
    });

    const result = { set: setInfo, cards };
    await setCachedSet(setId, result);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch set" }, { status: 500 });
  }
}
