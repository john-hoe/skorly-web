import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "./env";

const acquireJobLock = vi.fn();
const releaseJobLock = vi.fn();
const scoreFinishedPredictions = vi.fn();
const seedTeamIdentities = vi.fn();
const setDbClientCacheEnabled = vi.fn();
const ingestFixtures = vi.fn();
const generatePosters = vi.fn();
const sendNotifications = vi.fn();
const sendPremiumEmails = vi.fn();

vi.mock("@skorly/db", () => ({
  acquireJobLock,
  releaseJobLock,
  scoreFinishedPredictions,
  seedTeamIdentities,
  setDbClientCacheEnabled,
}));

vi.mock("./ingest-fixtures", () => ({ ingestFixtures }));
vi.mock("./generate-posters", () => ({ generatePosters }));
vi.mock("./send-notifications", () => ({ sendNotifications }));
vi.mock("./send-premium-email", () => ({ sendPremiumEmails }));

const { default: worker } = await import("./index");
const disabledDbCacheAtImport = setDbClientCacheEnabled.mock.calls.some(
  ([enabled]) => enabled === false,
);

const env: Env = {
  DATABASE_URL: "",
  API_FOOTBALL_KEY: "",
  DEEPSEEK_API_KEY: "",
  OPENROUTER_API_KEY: "",
  API_FOOTBALL_BASE_URL: "https://example.test",
  DEEPSEEK_BASE_URL: "https://example.test",
  OPENROUTER_BASE_URL: "https://example.test",
  JOBS_ADMIN_SECRET: "secret",
};

function manualRequest(path: string, secret = "secret") {
  return new Request(`https://jobs.test${path}`, {
    method: "POST",
    headers: { "x-admin-secret": secret },
  });
}

describe("manual jobs endpoint guard", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    acquireJobLock.mockResolvedValue(true);
    releaseJobLock.mockResolvedValue(undefined);
    scoreFinishedPredictions.mockResolvedValue(undefined);
    seedTeamIdentities.mockResolvedValue(3);
    ingestFixtures.mockResolvedValue({ teams: 1, fixtures: 2, standings: 3, season: 2026 });
    generatePosters.mockResolvedValue({ prematch: 1, result: 0 });
    sendNotifications.mockResolvedValue({ kickoff: 0, goals: 0, results: 0 });
    sendPremiumEmails.mockResolvedValue({ fixtures: 1, emails: 2, whatsapp: 0 });
  });

  it("disables shared database client caching in the jobs Worker", () => {
    expect(disabledDbCacheAtImport).toBe(true);
  });

  it("rejects non-POST manual run requests before auth", async () => {
    const res = await worker.fetch(new Request("https://jobs.test/__run/notify"), env);

    expect(res.status).toBe(405);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "method_not_allowed",
    });
  });

  it("rejects POST manual run requests without the admin secret", async () => {
    const res = await worker.fetch(
      new Request("https://jobs.test/__run/notify", { method: "POST" }),
      env,
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  it("returns 404 for authenticated unknown manual run paths", async () => {
    const res = await worker.fetch(manualRequest("/__run/not-real"), env);

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("returns 409 and does not run the task when the job lock is held", async () => {
    acquireJobLock.mockResolvedValue(false);

    const res = await worker.fetch(manualRequest("/__run/premium-email"), env);

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "locked" });
    expect(sendPremiumEmails).not.toHaveBeenCalled();
    expect(releaseJobLock).not.toHaveBeenCalled();
  });

  it("runs and releases the lock for authenticated manual tasks", async () => {
    const res = await worker.fetch(manualRequest("/__run/notify"), env);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(acquireJobLock).toHaveBeenCalledWith(
      "jobs:score-and-notify",
      expect.any(String),
      600,
    );
    expect(scoreFinishedPredictions).toHaveBeenCalledTimes(1);
    expect(sendNotifications).toHaveBeenCalledTimes(1);
    expect(releaseJobLock).toHaveBeenCalledWith(
      "jobs:score-and-notify",
      expect.any(String),
    );
  });

  it("locks ingest, posters, and seed identity manual endpoints", async () => {
    await worker.fetch(manualRequest("/__run/ingest"), env);
    await worker.fetch(manualRequest("/__run/posters"), env);
    await worker.fetch(manualRequest("/__run/seed-identities"), env);

    expect(acquireJobLock).toHaveBeenCalledWith("jobs:ingest", expect.any(String), 1800);
    expect(acquireJobLock).toHaveBeenCalledWith("jobs:posters", expect.any(String), 1800);
    expect(acquireJobLock).toHaveBeenCalledWith(
      "jobs:seed-identities",
      expect.any(String),
      600,
    );
    expect(ingestFixtures).toHaveBeenCalledTimes(1);
    expect(generatePosters).toHaveBeenCalledTimes(1);
    expect(seedTeamIdentities).toHaveBeenCalledTimes(1);
  });

  it("returns a redacted message for authenticated manual task failures", async () => {
    ingestFixtures.mockRejectedValue(new Error("database failed token abcdefghijklmnopqrstuvwxyz123456"));

    const res = await worker.fetch(manualRequest("/__run/ingest"), env);

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "internal",
      message: "database failed token [redacted]",
    });
  });

  it("uses Upstash Redis locks when configured", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as unknown[][];
      const command = body[0]?.[0];
      if (command === "SET") {
        return Response.json([{ result: "OK" }]);
      }
      if (command === "EVAL") {
        return Response.json([{ result: 1 }]);
      }
      return Response.json([{ result: null }]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await worker.fetch(manualRequest("/__run/seed-identities"), {
      ...env,
      UPSTASH_REDIS_REST_URL: "https://redis.test",
      UPSTASH_REDIS_REST_TOKEN: "token",
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ written: 3 });
    expect(acquireJobLock).not.toHaveBeenCalled();
    expect(releaseJobLock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as unknown[][];
    expect(firstBody[0]).toEqual([
      "SET",
      "job-lock:jobs:seed-identities",
      expect.any(String),
      "NX",
      "EX",
      "600",
    ]);
  });

  it("returns 503 when the configured Redis lock backend fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );

    const res = await worker.fetch(manualRequest("/__run/posters"), {
      ...env,
      UPSTASH_REDIS_REST_URL: "https://redis.test",
      UPSTASH_REDIS_REST_TOKEN: "token",
    });

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "lock_error" });
    expect(generatePosters).not.toHaveBeenCalled();
    expect(acquireJobLock).not.toHaveBeenCalled();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
