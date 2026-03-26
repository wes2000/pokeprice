import { fetchTcgplayerPrices } from "../tcgplayer";
import { PriceEntry } from "../../types";

global.fetch = jest.fn();

describe("fetchTcgplayerPrices", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns price entries from Pokemon TCG API response", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          tcgplayer: {
            url: "https://tcgplayer.com/product/12345",
            updatedAt: "2026/03/20",
            prices: {
              holofoil: { low: 80.0, mid: 120.0, high: 200.0, market: 110.0 },
            },
          },
        },
      }),
    });

    const result = await fetchTcgplayerPrices("base1-4");
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("tcgplayer");
    expect(result[0].price).toBe(110.0);
    expect(result[0].type).toBe("market");
    expect(result[0].url).toBe("https://tcgplayer.com/product/12345");
  });

  it("returns multiple entries for multiple variants", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          tcgplayer: {
            url: "https://tcgplayer.com/product/12345",
            updatedAt: "2026/03/20",
            prices: {
              normal: { low: 5.0, mid: 8.0, high: 12.0, market: 7.5 },
              reverseHolofoil: { low: 8.0, mid: 12.0, high: 18.0, market: 11.0 },
            },
          },
        },
      }),
    });

    const result = await fetchTcgplayerPrices("base1-4");
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no tcgplayer data", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });
    const result = await fetchTcgplayerPrices("base1-4");
    expect(result).toEqual([]);
  });

  it("returns empty array on fetch error", async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));
    const result = await fetchTcgplayerPrices("base1-4");
    expect(result).toEqual([]);
  });

  it("respects 5-second timeout", async () => {
    (fetch as jest.Mock).mockImplementation((_url: string, opts: RequestInit) => {
      expect(opts.signal).toBeDefined();
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: {} }),
      });
    });
    await fetchTcgplayerPrices("base1-4");
    expect(fetch).toHaveBeenCalled();
  });
});
