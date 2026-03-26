import { PriceEntry } from "../types";

const BASE_URL = "https://www.pricecharting.com/game/pokemon";
const TIMEOUT_MS = 5000;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function extractPrice(html: string, id: string): number | null {
  const regex = new RegExp(
    `id=["']${id}["'][^>]*>[\\s\\S]*?\\$([\\d,]+\\.\\d{2})`,
    "i"
  );
  const match = html.match(regex);
  if (!match) return null;
  return parseFloat(match[1].replace(",", ""));
}

export async function fetchPriceChartingPrices(
  cardName: string,
  setName: string
): Promise<PriceEntry[]> {
  try {
    const slug = slugify(`${cardName} ${setName}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${BASE_URL}/${slug}`, {
      headers: { "User-Agent": "PokePriceDashboard/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const html = await res.text();
    const entries: PriceEntry[] = [];
    const now = new Date().toISOString();

    const ungraded = extractPrice(html, "used_price");
    if (ungraded != null) {
      entries.push({
        source: "pricecharting",
        price: ungraded,
        condition: "Ungraded",
        date: now,
        type: "market",
        url: `${BASE_URL}/${slug}`,
      });
    }

    const complete = extractPrice(html, "complete_price");
    if (complete != null) {
      entries.push({
        source: "pricecharting",
        price: complete,
        condition: "Complete",
        date: now,
        type: "market",
        url: `${BASE_URL}/${slug}`,
      });
    }

    return entries;
  } catch {
    return [];
  }
}
