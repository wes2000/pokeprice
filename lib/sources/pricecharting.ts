import { PriceEntry } from "../types";

const SEARCH_URL = "https://www.pricecharting.com/search-products";
const TIMEOUT_MS = 5000;

function extractPrice(html: string, id: string): number | null {
  const regex = new RegExp(
    `id=["']${id}["'][^>]*>[\\s\\S]*?\\$([\\d,]+\\.\\d{2})`,
    "i"
  );
  const match = html.match(regex);
  if (!match) return null;
  return parseFloat(match[1].replace(",", ""));
}

function extractCanonicalUrl(html: string): string | null {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

export async function fetchPriceChartingPrices(
  cardName: string,
  setName: string
): Promise<PriceEntry[]> {
  if (!cardName) return [];

  try {
    // Use PriceCharting's search to find the correct page
    const query = `${cardName} ${setName}`.trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const searchParams = new URLSearchParams({
      q: query,
      type: "prices",
      category: "pokemon-cards",
    });

    const res = await fetch(`${SEARCH_URL}?${searchParams}`, {
      headers: { "User-Agent": "PokePriceDashboard/1.0" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const html = await res.text();
    const pageUrl = extractCanonicalUrl(html) || res.url;
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
        url: pageUrl,
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
        url: pageUrl,
      });
    }

    return entries;
  } catch {
    return [];
  }
}
