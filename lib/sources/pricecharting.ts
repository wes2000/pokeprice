import { PriceEntry } from "../types";

const SEARCH_URL = "https://www.pricecharting.com/search-products";
const TIMEOUT_MS = 8000;

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

/** Extract historical price data from PriceCharting's embedded chart data */
export function extractPriceHistory(html: string): { date: string; price: number }[] {
  // PriceCharting embeds chart data in JavaScript — look for the price array
  const chartMatch = html.match(/var\s+used_price\s*=\s*\[([^\]]+)\]/);
  if (!chartMatch) return [];

  const points: { date: string; price: number }[] = [];
  // Format: [[Date.UTC(year,month,day), price], ...]
  const entryRegex = /Date\.UTC\((\d+),(\d+),(\d+)\)\s*,\s*([\d.]+)/g;
  let m;
  while ((m = entryRegex.exec(chartMatch[1])) !== null) {
    const year = parseInt(m[1]);
    const month = parseInt(m[2]); // 0-indexed in JS
    const day = parseInt(m[3]);
    const price = parseFloat(m[4]);
    if (!isNaN(price) && price > 0) {
      const d = new Date(Date.UTC(year, month, day));
      points.push({ date: d.toISOString().split("T")[0], price });
    }
  }
  return points;
}

export async function fetchPriceChartingPrices(
  cardName: string,
  setName: string
): Promise<{ entries: PriceEntry[]; priceHistory: { date: string; price: number }[] }> {
  if (!cardName) return { entries: [], priceHistory: [] };

  try {
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

    if (!res.ok) return { entries: [], priceHistory: [] };

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

    // Also try to extract "new" (sealed/mint) price
    const newPrice = extractPrice(html, "new_price");
    if (newPrice != null) {
      entries.push({
        source: "pricecharting",
        price: newPrice,
        condition: "Graded 9-10",
        date: now,
        type: "market",
        url: pageUrl,
      });
    }

    const priceHistory = extractPriceHistory(html);

    return { entries, priceHistory };
  } catch {
    return { entries: [], priceHistory: [] };
  }
}
