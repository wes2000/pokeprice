import { calculateSuperGuess } from "../super-guess";
import { PriceEntry } from "../types";

const now = new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

describe("calculateSuperGuess", () => {
  it("returns estimate from a single sold listing", () => {
    const prices: PriceEntry[] = [
      { source: "ebay", price: 10.0, condition: "Near Mint", date: now, type: "sold" },
    ];
    const result = calculateSuperGuess(prices);
    expect(result.estimate).toBeCloseTo(10.0, 2);
    expect(result.confidence).toBe("low");
    expect(result.dataPoints).toBe(1);
  });

  it("weights sold listings higher than market prices", () => {
    const prices: PriceEntry[] = [
      { source: "ebay", price: 20.0, condition: "Near Mint", date: now, type: "sold" },
      { source: "tcgplayer", price: 10.0, condition: "Near Mint", date: now, type: "market" },
    ];
    const result = calculateSuperGuess(prices);
    expect(result.estimate).toBeCloseTo(17.5, 2);
  });

  it("applies recency decay to old data", () => {
    const prices: PriceEntry[] = [
      { source: "ebay", price: 10.0, condition: "Near Mint", date: daysAgo(60), type: "sold" },
    ];
    const result = calculateSuperGuess(prices);
    expect(result.estimate).toBeCloseTo(10.0, 2);
  });

  it("removes outliers beyond 2 standard deviations", () => {
    const prices: PriceEntry[] = [
      { source: "ebay", price: 10.0, condition: "Near Mint", date: now, type: "sold" },
      { source: "ebay", price: 11.0, condition: "Near Mint", date: now, type: "sold" },
      { source: "ebay", price: 10.5, condition: "Near Mint", date: now, type: "sold" },
      { source: "ebay", price: 9.5, condition: "Near Mint", date: now, type: "sold" },
      { source: "ebay", price: 100.0, condition: "Near Mint", date: now, type: "sold" },
    ];
    const result = calculateSuperGuess(prices);
    expect(result.estimate).toBeCloseTo(10.25, 1);
    expect(result.dataPoints).toBe(4);
  });

  it("returns high confidence with 5+ recent sold listings", () => {
    const prices: PriceEntry[] = Array.from({ length: 6 }, (_, i) => ({
      source: "ebay" as const,
      price: 10.0 + i * 0.5,
      condition: "Near Mint",
      date: daysAgo(i),
      type: "sold" as const,
    }));
    const result = calculateSuperGuess(prices);
    expect(result.confidence).toBe("high");
  });

  it("returns medium confidence with 2-4 recent sold listings", () => {
    const prices: PriceEntry[] = [
      { source: "ebay", price: 10.0, condition: "Near Mint", date: daysAgo(5), type: "sold" },
      { source: "ebay", price: 11.0, condition: "Near Mint", date: daysAgo(10), type: "sold" },
      { source: "tcgplayer", price: 10.5, condition: "Near Mint", date: now, type: "market" },
    ];
    const result = calculateSuperGuess(prices);
    expect(result.confidence).toBe("medium");
  });

  it("returns zero estimate for empty input", () => {
    const result = calculateSuperGuess([]);
    expect(result.estimate).toBe(0);
    expect(result.confidence).toBe("low");
    expect(result.dataPoints).toBe(0);
  });
});
