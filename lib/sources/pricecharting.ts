import { PriceEntry } from "../types";

const BASE_URL = "https://www.pricecharting.com";
const SEARCH_URL = `${BASE_URL}/search-products`;
const TIMEOUT_MS = 8000;
const HEADERS = { "User-Agent": "PokePriceDashboard/1.0" };

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

/** Check if HTML is a card detail page (has price table) vs a search results list */
function isCardPage(html: string): boolean {
  return html.includes('id="used_price"') || html.includes('id="complete_price"');
}

/** Extract first /game/ link from a search results page */
function extractFirstCardLink(html: string): string | null {
  const match = html.match(/\/game\/pokemon[^"'<>\s]+/);
  if (!match || match[0] === "/game/*") return null;
  return match[0];
}

/** Build a slug from text: lowercase, replace non-alphanumeric with hyphens, collapse */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Try to construct the direct PriceCharting URL for a card */
function buildDirectUrl(cardName: string, setName: string, cardNumber: string): string {
  const setSlug = `pokemon-${slugify(setName)}`;
  // cardNumber is like "29/131" — we just want "29"
  const num = cardNumber.split("/")[0];
  const cardSlug = `${slugify(cardName)}-${num}`;
  return `${BASE_URL}/game/${setSlug}/${cardSlug}`;
}

/** Extract historical price data from PriceCharting's embedded chart data */
export function extractPriceHistory(html: string): { date: string; price: number }[] {
  const chartMatch = html.match(/var\s+used_price\s*=\s*\[([^\]]+)\]/);
  if (!chartMatch) return [];

  const points: { date: string; price: number }[] = [];
  const entryRegex = /Date\.UTC\((\d+),(\d+),(\d+)\)\s*,\s*([\d.]+)/g;
  let m;
  while ((m = entryRegex.exec(chartMatch[1])) !== null) {
    const year = parseInt(m[1]);
    const month = parseInt(m[2]);
    const day = parseInt(m[3]);
    const price = parseFloat(m[4]);
    if (!isNaN(price) && price > 0) {
      const d = new Date(Date.UTC(year, month, day));
      points.push({ date: d.toISOString().split("T")[0], price });
    }
  }
  return points;
}

/** Fetch a page and return its HTML, or null on failure */
async function fetchPage(url: string, signal: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal, redirect: "follow" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Extract sold listings from the completed-auctions table */
function extractSoldListings(html: string): PriceEntry[] {
  const entries: PriceEntry[] = [];

  // Match each <tr> row in the sold listings table
  // Each row: <td class="date">DATE</td> ... <td class="title">TITLE [SOURCE]</td> ... <span class="js-price">$PRICE</span>
  const rowRegex = /<tr[^>]*>\s*<td class="date">(\d{4}-\d{2}-\d{2})<\/td>[\s\S]*?<td class="title"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<span class="js-price"[^>]*>\$([0-9,.]+)<\/span>/g;

  let match;
  while ((match = rowRegex.exec(html)) !== null && entries.length < 15) {
    const date = match[1];
    const titleBlock = match[2];
    const price = parseFloat(match[3].replace(",", ""));
    if (isNaN(price) || price <= 0) continue;

    // Determine source and extract URL
    const isTcgplayer = titleBlock.includes("[TCGPlayer]");
    const isEbay = titleBlock.includes("[eBay]");
    const source = isTcgplayer ? "TCGPlayer" : isEbay ? "eBay" : "Other";

    // Extract link URL if present
    let url: string | undefined;
    const linkMatch = titleBlock.match(/href="([^"]+)"/);
    if (linkMatch) {
      // TCGPlayer links go through partner redirect — extract the actual URL
      const rawUrl = linkMatch[1].replace(/&amp;/g, "&");
      const uParam = rawUrl.match(/[?&]u=([^&]+)/);
      url = uParam ? decodeURIComponent(uParam[1]) : rawUrl;
    }

    entries.push({
      source: "pricecharting",
      price,
      condition: `Ungraded · ${source}`,
      date: `${date}T00:00:00Z`,
      type: "sold",
      url,
    });
  }

  return entries;
}

function extractPricesFromHtml(
  html: string,
  pageUrl: string
): { entries: PriceEntry[]; priceHistory: { date: string; price: number }[] } {
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

  // Extract individual sold listings
  const soldListings = extractSoldListings(html);
  entries.push(...soldListings);

  const priceHistory = extractPriceHistory(html);

  return { entries, priceHistory };
}

export async function fetchPriceChartingPrices(
  cardName: string,
  setName: string,
  cardNumber: string
): Promise<{ entries: PriceEntry[]; priceHistory: { date: string; price: number }[] }> {
  const empty = { entries: [], priceHistory: [] };
  if (!cardName) return empty;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Strategy 1: Try direct URL construction (fastest, most reliable)
    if (setName && cardNumber) {
      const directUrl = buildDirectUrl(cardName, setName, cardNumber);
      console.log(`[PriceCharting] Trying direct URL: ${directUrl}`);
      const html = await fetchPage(directUrl, controller.signal);
      if (html && isCardPage(html)) {
        const pageUrl = extractCanonicalUrl(html) || directUrl;
        console.log(`[PriceCharting] Direct URL hit for ${cardName}`);
        clearTimeout(timeout);
        return extractPricesFromHtml(html, pageUrl);
      }
    }

    // Strategy 2: Search and follow first result link
    const query = `${cardName} ${setName}`.trim();
    const searchParams = new URLSearchParams({
      q: query,
      type: "prices",
      category: "pokemon-cards",
    });

    console.log(`[PriceCharting] Searching: "${query}"`);
    const searchHtml = await fetchPage(`${SEARCH_URL}?${searchParams}`, controller.signal);
    if (!searchHtml) {
      clearTimeout(timeout);
      return empty;
    }

    // If the search redirected directly to a card page, use it
    if (isCardPage(searchHtml)) {
      const pageUrl = extractCanonicalUrl(searchHtml) || `${SEARCH_URL}?${searchParams}`;
      console.log(`[PriceCharting] Search redirected to card page`);
      clearTimeout(timeout);
      return extractPricesFromHtml(searchHtml, pageUrl);
    }

    // Otherwise, parse the first card link from search results and fetch it
    const firstLink = extractFirstCardLink(searchHtml);
    if (!firstLink) {
      console.warn(`[PriceCharting] No card links found in search results for "${query}"`);
      clearTimeout(timeout);
      return empty;
    }

    const cardUrl = `${BASE_URL}${firstLink}`;
    console.log(`[PriceCharting] Following first result: ${cardUrl}`);
    const cardHtml = await fetchPage(cardUrl, controller.signal);
    clearTimeout(timeout);

    if (!cardHtml || !isCardPage(cardHtml)) return empty;

    const pageUrl = extractCanonicalUrl(cardHtml) || cardUrl;
    return extractPricesFromHtml(cardHtml, pageUrl);
  } catch {
    clearTimeout(timeout);
    return empty;
  }
}
