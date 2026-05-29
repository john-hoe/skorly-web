import { describe, it, expect, vi } from "vitest";
import { ApiFootballClient } from "./client";

function mockFetch(payload: unknown) {
  return vi.fn(async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  ) as unknown as typeof fetch;
}

describe("ApiFootballClient", () => {
  it("sends the api key header and parses fixtures", async () => {
    const fetchImpl = mockFetch({
      get: "fixtures",
      parameters: {},
      errors: [],
      results: 1,
      paging: { current: 1, total: 1 },
      response: [{ fixture: { id: 42 } }],
    });
    const client = new ApiFootballClient({ apiKey: "test", fetchImpl });
    const res = await client.fixturesByLeague(1, 2026);
    expect(res.results).toBe(1);
    const firstCall = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(firstCall?.[1]).toMatchObject({
      headers: { "x-apisports-key": "test" },
    });
  });

  it("throws on non-200", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("nope", { status: 429 })
    ) as unknown as typeof fetch;
    const client = new ApiFootballClient({ apiKey: "test", fetchImpl });
    await expect(client.teamsByLeague(1, 2026)).rejects.toThrow(/429/);
  });
});
