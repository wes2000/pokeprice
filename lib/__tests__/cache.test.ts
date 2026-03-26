import { getCachedPrices, setCachedPrices } from "../cache";
import { PriceResult } from "../types";

jest.mock("@vercel/kv", () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

import { kv } from "@vercel/kv";

const mockResult: PriceResult = {
  cardId: "base1-4",
  cardName: "Charizard",
  setName: "Base Set",
  cardNumber: "4/102",
  imageUrl: "https://images.pokemontcg.io/base1/4.png",
  rarity: "Rare Holo",
  prices: [],
  superGuess: { estimate: 150.0, confidence: "high", dataPoints: 5, lastUpdated: new Date().toISOString() },
  sources: {},
};

describe("cache", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns cached data on hit", async () => {
    (kv.get as jest.Mock).mockResolvedValue(mockResult);
    const result = await getCachedPrices("base1-4");
    expect(result).toEqual(mockResult);
    expect(kv.get).toHaveBeenCalledWith("prices:base1-4");
  });

  it("returns null on cache miss", async () => {
    (kv.get as jest.Mock).mockResolvedValue(null);
    const result = await getCachedPrices("base1-4");
    expect(result).toBeNull();
  });

  it("sets cache with 4-hour TTL", async () => {
    await setCachedPrices("base1-4", mockResult);
    expect(kv.set).toHaveBeenCalledWith("prices:base1-4", mockResult, { ex: 14400 });
  });

  it("returns null on KV error instead of throwing", async () => {
    (kv.get as jest.Mock).mockRejectedValue(new Error("KV down"));
    const result = await getCachedPrices("base1-4");
    expect(result).toBeNull();
  });
});
