import { NextRequest, NextResponse } from "next/server";
import { CardSearchResult } from "@/lib/types";
import { getCachedSearch, setCachedSearch } from "@/lib/cache";

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2";

/**
 * Normalize user input for the Pokemon TCG API:
 * - "misty's psyduck" or "mistys psyduck" → name:"misty* psyduck*"
 * - "misty's psyduck #193" → name:"misty* psyduck*" number:193
 * - "charizard 4/102" → name:"charizard*" number:4
 * - "base set" → set.name:"base set*"
 */
function buildSearchQuery(raw: string): string {
  const parts: string[] = [];
  let remaining = raw.trim();

  // Extract card number patterns: "193/182", "4/102", "#193", "# 193"
  const slashMatch = remaining.match(/(\d+)\s*\/\s*\d+/);
  if (slashMatch) {
    parts.push(`number:${slashMatch[1]}`);
    remaining = remaining.replace(slashMatch[0], "").trim();
  } else {
    const hashMatch = remaining.match(/#\s*(\d+)/);
    if (hashMatch) {
      parts.push(`number:${hashMatch[1]}`);
      remaining = remaining.replace(hashMatch[0], "").trim();
    }
  }

  if (!remaining) {
    return parts.join(" ");
  }

  // Clean up the text for name matching
  let cleaned = remaining
    .replace(/"/g, "")         // remove quotes
    .replace(/[''`]/g, "")    // remove all apostrophe variants (straight, curly, backtick)
    .replace(/\u2019/g, "")   // remove right single quote (used in Pokémon names)
    .replace(/\u2018/g, "")   // remove left single quote
    .replace(/[^\w\s-]/g, "") // remove other special chars but keep hyphens
    .trim();

  // Strip trailing "s" from words that look like possessives without apostrophe
  // e.g., "mistys" → "misty", "brocks" → "brock"
  // But don't strip from normal words like "sparks", "fates", "forces"
  // Heuristic: only strip if the word without 's' is followed by another word (possessive pattern)
  cleaned = cleaned.replace(/\b(\w+)s\b(?=\s+\w)/g, (match, word) => {
    // Known possessive trainer names — strip the s
    const possessiveNames = ["misty", "brock", "blaine", "erika", "koga", "sabrina", "surge", "giovanni", "jasmine", "clair", "morty", "chuck", "pryce", "bugsy", "whitney", "falkner", "janine"];
    if (possessiveNames.includes(word.toLowerCase())) {
      return word;
    }
    return match; // keep as-is for other words
  });

  // Wildcard each word so partial matches work
  // "misty psyduck" → "misty* psyduck*"
  const words = cleaned.split(/\s+/).filter(Boolean);
  const wildcarded = words.map((w) => `${w}*`).join(" ");

  const nameQuery = `name:"${wildcarded}"`;
  const setQuery = `set.name:"${wildcarded}"`;

  if (parts.length > 0) {
    parts.unshift(`(${nameQuery} OR ${setQuery})`);
  } else {
    parts.push(`(${nameQuery} OR ${setQuery})`);
  }

  return parts.join(" ");
}

/** Clean up user input for set search */
function buildSetSearchQuery(raw: string): string {
  return raw
    .trim()
    .replace(/"/g, "")
    .replace(/#\s*\d+/g, "")  // remove #number
    .replace(/\d+\s*\/\s*\d+/g, "") // remove number/number
    .replace(/[''`\u2018\u2019]/g, "") // remove apostrophes
    .trim();
}

interface SearchResponse {
  results: CardSearchResult[];
  sets: { id: string; name: string; series: string; releaseDate: string; total: number; logoUrl: string }[];
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], sets: [] });
  }

  const cached = await getCachedSearch<SearchResponse>(q);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const query = buildSearchQuery(q);
    const setSearchText = buildSetSearchQuery(q);

    const [cardsRes, setsRes] = await Promise.all([
      fetch(
        `${POKEMON_TCG_API}/cards?q=${encodeURIComponent(query)}&pageSize=8&select=id,name,set,number,rarity,images`
      ),
      setSearchText.length >= 2
        ? fetch(
            `${POKEMON_TCG_API}/sets?q=name:"${encodeURIComponent(setSearchText)}*"&orderBy=-releaseDate&pageSize=5`
          )
        : Promise.resolve(null),
    ]);

    const results: CardSearchResult[] = [];
    if (cardsRes.ok) {
      const data = await cardsRes.json();
      for (const card of data.data || []) {
        results.push({
          id: card.id,
          name: card.name,
          setName: (card.set as { name: string })?.name || "",
          number: `${card.number}/${(card.set as { printedTotal: number })?.printedTotal || "?"}`,
          rarity: (card.rarity as string) || "Unknown",
          imageUrl: (card.images as { small: string })?.small || "",
        });
      }
    }

    const sets: SearchResponse["sets"] = [];
    if (setsRes && setsRes.ok) {
      const setsData = await setsRes.json();
      for (const s of setsData.data || []) {
        sets.push({
          id: s.id,
          name: s.name,
          series: s.series,
          releaseDate: s.releaseDate,
          total: s.printedTotal || s.total,
          logoUrl: s.images?.logo || "",
        });
      }
    }

    const response: SearchResponse = { results, sets };
    await setCachedSearch(q, response);
    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ results: [], sets: [] }, { status: 500 });
  }
}
