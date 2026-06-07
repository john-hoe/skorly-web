import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "./env";

const acquireJobLock = vi.fn();
const releaseJobLock = vi.fn();
const scoreFinishedPredictions = vi.fn();
const seedTeamIdentities = vi.fn();
const ingestFixtures = vi.fn();
const generatePosters = vi.fn();
const sendNotifications = vi.fn();
const sendPremiumEmails = vi.fn();

vi.mock("@skorly/db", () => ({
  acquireJobLock,
  releaseJobLock,
  scoreFinishedPredictions,
  seedTeamIdentities,
}));

vi.mock("./ingest-fixtures", () => ({ ingestFixtures }));
vi.mock("./generate-posters", () => ({ generatePosters }));
vi.mock("./send-notifications", () => ({ sendNotifications }));
vi.mock("./send-premium-email", () => ({ sendPremiumEmails }));

const { default: worker } = await import("./index");

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
});
