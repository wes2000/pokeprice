import { PriceEntry } from "../types";

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2/cards";
const TIMEOUT_MS = 5000;

interface TcgplayerVariantPrices {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
}

export interface CardMetadata {
  name: string;
  setName: string;
  cardNumber: string;
  imageUrl: string;
  rarity: string;
}

export interface TcgplayerResult {
  prices: PriceEntry[];
  metadata: CardMetadata | null;
}

/** Fetch TCGplayer prices AND card metadata in a single API call */
export async function fetchTcgplayerPrices(cardId: string): Promise<TcgplayerResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${POKEMON_TCG_API}/${cardId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return { prices: [], metadata: null };

    const json = await res.json();
    const card = json.data;
    if (!card) return { prices: [], metadata: null };

    // Extract metadata (saves a separate API call)
    const metadata: CardMetadata = {
      name: card.name || "",
      setName: card.set?.name || "",
      cardNumber: `${card.number}/${card.set?.printedTotal || "?"}`,
      imageUrl: card.images?.small || "",
      rarity: card.rarity || "Unknown",
    };

    const tcgplayer = card.tcgplayer;
    if (!tcgplayer?.prices) return { prices: [], metadata };

    const entries: PriceEntry[] = [];
    const dateStr = tcgplayer.updatedAt
      ? new Date(tcgplayer.updatedAt).toISOString()
      : new Date().toISOString();

    for (const [variant, variantPrices] of Object.entries(tcgplayer.prices)) {
      const vp = variantPrices as TcgplayerVariantPrices;
      if (vp.market != null) {
        entries.push({
          source: "tcgplayer",
          price: vp.market,
          condition: variant === "normal" ? "Normal" : variant === "holofoil" ? "Holofoil" : variant === "reverseHolofoil" ? "Reverse Holo" : variant === "1stEditionHolofoil" ? "1st Ed Holo" : variant,
          date: dateStr,
          type: "market",
          url: tcgplayer.url,
        });
      }
    }

    return { prices: entries, metadata };
  } catch {
    return { prices: [], metadata: null };
  }
}
