import { afterEach, describe, it, expect, vi } from "vitest";
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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
    const client = new ApiFootballClient({ apiKey: "test", fetchImpl, maxRetries: 0 });
    await expect(client.teamsByLeague(1, 2026)).rejects.toThrow(/429/);
  });

  it("retries API-Football 429 responses and counts each request", async () => {
    const onRequest = vi.fn();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("limited", { status: 429 }))
      .mockResolvedValueOnce(
        Response.json({
          get: "fixtures",
          parameters: {},
          errors: [],
          results: 0,
          paging: { current: 1, total: 1 },
          response: [],
        }),
      ) as unknown as typeof fetch;
    const client = new ApiFootballClient({
      apiKey: "test",
      fetchImpl,
      onRequest,
      retryBaseDelayMs: 0,
    });

    await client.liveFixtures(1);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(onRequest).toHaveBeenCalledTimes(2);
  });

  it("requests fixture events by API fixture id", async () => {
    const fetchImpl = mockFetch({
      get: "fixtures/events",
      parameters: {},
      errors: [],
      results: 0,
      paging: { current: 1, total: 1 },
      response: [],
    });
    const client = new ApiFootballClient({ apiKey: "test", fetchImpl });

    await client.fixtureEvents(123);

    const firstCall = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(String(firstCall?.[0])).toContain("/fixtures/events?fixture=123");
  });

  it("requests one fixture by API fixture id", async () => {
    const fetchImpl = mockFetch({
      get: "fixtures",
      parameters: {},
      errors: [],
      results: 0,
      paging: { current: 1, total: 1 },
      response: [],
    });
    const client = new ApiFootballClient({ apiKey: "test", fetchImpl });

    await client.fixtureById(456);

    const firstCall = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(String(firstCall?.[0])).toContain("/fixtures?id=456");
  });

  it("binds the default global fetch for Workers-compatible calls", async () => {
    const receivers: unknown[] = [];
    const fetchImpl = vi.fn(function (this: unknown) {
      receivers.push(this);
      return Promise.resolve(
        Response.json({
          get: "fixtures",
          parameters: {},
          errors: [],
          results: 0,
          paging: { current: 1, total: 1 },
          response: [],
        }),
      );
    }) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchImpl);

    const client = new ApiFootballClient({ apiKey: "test" });
    await client.fixturesByLeague(1, 2026);

    expect(receivers[0]).toBe(globalThis);
  });
});
