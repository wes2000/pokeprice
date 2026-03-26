import { PriceEntry } from "../types";

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2/cards";
const TIMEOUT_MS = 5000;

interface TcgplayerVariantPrices {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
}

export async function fetchTcgplayerPrices(cardId: string): Promise<PriceEntry[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${POKEMON_TCG_API}/${cardId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const json = await res.json();
    const tcgplayer = json.data?.tcgplayer;
    if (!tcgplayer?.prices) return [];

    const entries: PriceEntry[] = [];
    const dateStr = tcgplayer.updatedAt
      ? new Date(tcgplayer.updatedAt).toISOString()
      : new Date().toISOString();

    for (const [, variantPrices] of Object.entries(tcgplayer.prices)) {
      const vp = variantPrices as TcgplayerVariantPrices;
      if (vp.market != null) {
        entries.push({
          source: "tcgplayer",
          price: vp.market,
          condition: "Near Mint",
          date: dateStr,
          type: "market",
          url: tcgplayer.url,
        });
      }
    }

    return entries;
  } catch {
    return [];
  }
}
