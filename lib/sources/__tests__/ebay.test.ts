import { fetchEbayPrices } from "../ebay";

global.fetch = jest.fn();

const mockTokenResponse = {
  ok: true,
  json: async () => ({ access_token: "test-token", expires_in: 7200 }),
};

const mockSearchResponse = {
  ok: true,
  json: async () => ({
    itemSummaries: [
      {
        title: "Charizard Base Set 4/102 Near Mint",
        price: { value: "150.00", currency: "USD" },
        itemEndDate: "2026-03-20T00:00:00Z",
        condition: "New",
        itemWebUrl: "https://ebay.com/itm/123",
      },
      {
        title: "Charizard Base Set 4/102",
        price: { value: "140.00", currency: "USD" },
        itemEndDate: "2026-03-18T00:00:00Z",
        condition: "New",
        itemWebUrl: "https://ebay.com/itm/456",
      },
    ],
  }),
};

describe("fetchEbayPrices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EBAY_CLIENT_ID = "test-id";
    process.env.EBAY_CLIENT_SECRET = "test-secret";
  });

  afterEach(() => {
    delete process.env.EBAY_CLIENT_ID;
    delete process.env.EBAY_CLIENT_SECRET;
  });

  it("fetches OAuth token then searches active listings", async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce(mockTokenResponse)
      .mockResolvedValueOnce(mockSearchResponse);

    const result = await fetchEbayPrices("Charizard", "Base Set", "4/102");
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe("ebay");
    expect(result[0].price).toBe(150.0);
    expect(result[0].type).toBe("listed");
  });

  it("returns empty array when credentials are missing", async () => {
    delete process.env.EBAY_CLIENT_ID;
    const result = await fetchEbayPrices("Charizard", "Base Set", "4/102");
    expect(result).toEqual([]);
  });

  it("returns empty array on auth failure", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401 });
    const result = await fetchEbayPrices("Charizard", "Base Set", "4/102");
    expect(result).toEqual([]);
  });

  it("returns empty array when no itemSummaries", async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce(mockTokenResponse)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const result = await fetchEbayPrices("Charizard", "Base Set", "4/102");
    expect(result).toEqual([]);
  });

  it("reuses cached token on second call", async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce(mockTokenResponse)
      .mockResolvedValueOnce(mockSearchResponse)
      .mockResolvedValueOnce(mockSearchResponse);

    await fetchEbayPrices("Charizard", "Base Set", "4/102");
    await fetchEbayPrices("Pikachu", "Base Set", "58/102");
    // 3 fetch calls total: 1 token + 2 searches (token was cached)
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
