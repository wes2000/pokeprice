import { PriceEntry, SuperGuessResult, Confidence } from "./types";

const SOURCE_WEIGHTS: Record<string, number> = {
  sold: 3.0,
  market: 1.0,
  listed: 0.5,
};

function recencyMultiplier(dateStr: string): number {
  const ageMs = Date.now() - new Date(dateStr).getTime();
  const ageDays = ageMs / 86_400_000;
  if (ageDays <= 7) return 1.0;
  if (ageDays <= 30) return 0.8;
  if (ageDays <= 90) return 0.5;
  return 0.3;
}

function removeOutliers(prices: PriceEntry[]): PriceEntry[] {
  if (prices.length < 3) return prices;

  const values = prices.map((p) => p.price).sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  );

  if (stdDev === 0) return prices;

  return prices.filter(
    (p) => Math.abs(p.price - median) <= 2 * stdDev
  );
}

function calculateConfidence(prices: PriceEntry[]): Confidence {
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
  const recentSold = prices.filter(
    (p) => p.type === "sold" && new Date(p.date).getTime() >= thirtyDaysAgo
  ).length;

  if (recentSold >= 5) return "high";
  if (recentSold >= 2) return "medium";
  return "low";
}

export function calculateSuperGuess(prices: PriceEntry[]): SuperGuessResult {
  if (prices.length === 0) {
    return { estimate: 0, confidence: "low", dataPoints: 0, lastUpdated: new Date().toISOString() };
  }

  const filtered = removeOutliers(prices);
  const confidence = calculateConfidence(filtered);

  let weightedSum = 0;
  let weightSum = 0;

  for (const entry of filtered) {
    const sw = SOURCE_WEIGHTS[entry.type] ?? 1.0;
    const rm = recencyMultiplier(entry.date);
    weightedSum += entry.price * sw * rm;
    weightSum += sw * rm;
  }

  const estimate = weightSum > 0 ? weightedSum / weightSum : 0;

  return {
    estimate: Math.round(estimate * 100) / 100,
    confidence,
    dataPoints: filtered.length,
    lastUpdated: new Date().toISOString(),
  };
}
