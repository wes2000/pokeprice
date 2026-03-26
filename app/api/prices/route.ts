import { NextRequest, NextResponse } from "next/server";
import { getCachedPrices, setCachedPrices } from "@/lib/cache";
import { calculateSuperGuess } from "@/lib/super-guess";
import { buildSourceSummary } from "@/lib/source-summary";
import { fetchTcgplayerPrices } from "@/lib/sources/tcgplayer";
import { fetchEbayPrices } from "@/lib/sources/ebay";
import { fetchPriceChartingPrices } from "@/lib/sources/pricecharting";
import { PriceResult } from "@/lib/types";

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2/cards";

export async function GET(req: NextRequest) {
  const cardId = req.nextUrl.searchParams.get("cardId");
  if (!cardId) {
    return NextResponse.json({ error: "cardId required" }, { status: 400 });
  }

  const cached = await getCachedPrices(cardId);
  if (cached) {
    return NextResponse.json(cached);
  }

  let cardName = "", setName = "", cardNumber = "", imageUrl = "", rarity = "";
  try {
    const metaRes = await fetch(`${POKEMON_TCG_API}/${cardId}`);
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const card = meta.data;
      cardName = card.name || "";
      setName = card.set?.name || "";
      cardNumber = `${card.number}/${card.set?.printedTotal || "?"}`;
      imageUrl = card.images?.small || "";
      rarity = card.rarity || "Unknown";
    }
  } catch {}

  const [tcgPrices, ebayPrices, pcResult] = await Promise.all([
    fetchTcgplayerPrices(cardId),
    fetchEbayPrices(cardName, setName, cardNumber),
    fetchPriceChartingPrices(cardName, setName, cardNumber),
  ]);

  const allPrices = [...tcgPrices, ...ebayPrices, ...pcResult.entries];
  const superGuess = calculateSuperGuess(allPrices);
  const sources = buildSourceSummary(allPrices);

  const result: PriceResult = {
    cardId, cardName, setName, cardNumber, imageUrl, rarity,
    prices: allPrices, superGuess, sources,
    priceHistory: pcResult.priceHistory,
  };

  await setCachedPrices(cardId, result);
  return NextResponse.json(result);
}
