// lib/types.ts

export type PriceSourceName = "ebay" | "tcgplayer" | "pricecharting";
export type PriceType = "sold" | "listed" | "market";
export type Confidence = "high" | "medium" | "low";

export interface PriceEntry {
  source: PriceSourceName;
  price: number;
  condition: string;
  date: string; // ISO 8601
  type: PriceType;
  url?: string;
}

export interface PriceHistoryPoint {
  date: string; // YYYY-MM-DD
  price: number;
}

export interface SourceSummary {
  ebay?: { low: number; high: number; avg: number; count: number; recentDays: number };
  tcgplayer?: { market: number; low: number; high: number };
  pricecharting?: { ungraded: number; complete?: number };
}

export interface SuperGuessResult {
  estimate: number;
  confidence: Confidence;
  dataPoints: number;
  lastUpdated: string; // ISO 8601
}

export interface PriceResult {
  cardId: string;
  cardName: string;
  setName: string;
  cardNumber: string;
  imageUrl: string;
  rarity: string;
  prices: PriceEntry[];
  superGuess: SuperGuessResult;
  sources: SourceSummary;
  priceHistory?: PriceHistoryPoint[];
}

export interface CardSearchResult {
  id: string;
  name: string;
  setName: string;
  number: string;
  rarity: string;
  imageUrl: string;
}

export interface SetInfo {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  total: number;
  logoUrl: string;
  symbolUrl: string;
}

export interface SetCardEntry {
  id: string;
  name: string;
  number: string;
  imageUrl: string;
  rarity: string;
  superGuessEstimate?: number;
}

export interface RecentSearch {
  cardId: string;
  name: string;
  setName: string;
  number: string;
  imageUrl: string;
  lastPrice: number;
  timestamp: string; // ISO 8601
}
