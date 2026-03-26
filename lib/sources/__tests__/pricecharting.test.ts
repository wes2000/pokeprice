import { fetchPriceChartingPrices } from "../pricecharting";

global.fetch = jest.fn();

const mockHtml = `
<html><body>
<div id="used_price"><span class="price js-price">$145.00</span></div>
<div id="complete_price"><span class="price js-price">$180.00</span></div>
</body></html>
`;

describe("fetchPriceChartingPrices", () => {
  beforeEach(() => jest.clearAllMocks());

  it("extracts ungraded price from HTML", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
    });

    const result = await fetchPriceChartingPrices("Charizard", "Base Set");
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].source).toBe("pricecharting");
    expect(result[0].price).toBe(145.0);
    expect(result[0].type).toBe("market");
  });

  it("returns empty array on fetch error", async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));
    const result = await fetchPriceChartingPrices("Charizard", "Base Set");
    expect(result).toEqual([]);
  });

  it("returns empty array when price not found in HTML", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => "<html><body>No prices here</body></html>",
    });
    const result = await fetchPriceChartingPrices("Charizard", "Base Set");
    expect(result).toEqual([]);
  });

  it("returns empty array on non-OK response", async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: false, status: 429 });
    const result = await fetchPriceChartingPrices("Charizard", "Base Set");
    expect(result).toEqual([]);
  });
});
