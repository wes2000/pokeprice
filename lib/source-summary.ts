import { PriceEntry, SourceSummary } from "./types";

export function buildSourceSummary(prices: PriceEntry[]): SourceSummary {
  const summary: SourceSummary = {};

  const ebayPrices = prices.filter((p) => p.source === "ebay");
  if (ebayPrices.length > 0) {
    const vals = ebayPrices.map((p) => p.price);
    const maxAgeDays = Math.max(
      ...ebayPrices.map((p) => Math.ceil((Date.now() - new Date(p.date).getTime()) / 86_400_000))
    );
    summary.ebay = {
      low: Math.min(...vals),
      high: Math.max(...vals),
      avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
      count: vals.length,
      recentDays: maxAgeDays,
    };
  }

  const tcgPrices = prices.filter((p) => p.source === "tcgplayer");
  if (tcgPrices.length > 0) {
    const vals = tcgPrices.map((p) => p.price);
    summary.tcgplayer = {
      market: vals[0],
      low: Math.min(...vals),
      high: Math.max(...vals),
    };
  }

  const pcPrices = prices.filter((p) => p.source === "pricecharting");
  if (pcPrices.length > 0) {
    const ungraded = pcPrices.find((p) => p.condition === "Ungraded");
    const complete = pcPrices.find((p) => p.condition === "Complete");
    if (ungraded) {
      summary.pricecharting = {
        ungraded: ungraded.price,
        complete: complete?.price,
      };
    }
  }

  return summary;
}
