import { NextRequest, NextResponse } from "next/server";
import { getCachedPrices, setCachedPrices } from "@/lib/cache";
import { calculateSuperGuess } from "@/lib/super-guess";
import { buildSourceSummary } from "@/lib/source-summary";
import { fetchTcgplayerPrices } from "@/lib/sources/tcgplayer";
import { fetchEbayPrices } from "@/lib/sources/ebay";
import { fetchPriceChartingPrices } from "@/lib/sources/pricecharting";
import { PriceResult } from "@/lib/types";

export async function GET(req: NextRequest) {
  const cardId = req.nextUrl.searchParams.get("cardId");
  if (!cardId) {
    return NextResponse.json({ error: "cardId required" }, { status: 400 });
  }

  const cached = await getCachedPrices(cardId);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Step 1: Fetch TCGplayer prices + card metadata in ONE call (was two separate calls)
  const tcgResult = await fetchTcgplayerPrices(cardId);
  const meta = tcgResult.metadata;
  const cardName = meta?.name || "";
  const setName = meta?.setName || "";
  const cardNumber = meta?.cardNumber || "";
  const imageUrl = meta?.imageUrl || "";
  const rarity = meta?.rarity || "Unknown";

  // Step 2: Fetch eBay + PriceCharting in parallel (no longer blocked by metadata)
  const [ebayPrices, pcResult] = await Promise.all([
    fetchEbayPrices(cardName, setName, cardNumber),
    fetchPriceChartingPrices(cardName, setName, cardNumber),
  ]);

  const allPrices = [...tcgResult.prices, ...ebayPrices, ...pcResult.entries];
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
