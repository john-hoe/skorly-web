import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rest = vi.hoisted(() => ({
  callRpc: vi.fn(),
  deleteRows: vi.fn(),
  insertRows: vi.fn(),
  selectCount: vi.fn(),
  selectRows: vi.fn(),
  selectRowsWithCount: vi.fn(),
  updateRows: vi.fn(),
  upsertRows: vi.fn(),
}));

vi.mock("@/lib/runtime/supabase-rest", () => ({
  ...rest,
  inFilter: (values: Array<string | number>) => `in.(${values.join(",")})`,
}));

vi.mock("@skorly/predict-model", () => ({
  forecastMatch: vi.fn(),
  forecastSummary: vi.fn(),
}));

const {
  deleteRuntimeAdminMediaItem,
  deleteRuntimeAdminArticle,
  getRuntimeAdminMatches,
  getRuntimeAdminMedia,
  getRuntimeAdminMediaItem,
  getRuntimeAdminMediaKinds,
  getRuntimeAdminSubscribers,
  reportRuntimeComment,
  retryRuntimeAdminMediaItem,
  saveRuntimePushSubscription,
  setRuntimeAdminMatchStatus,
  setRuntimeAdminMediaUrl,
  setRuntimeAdminSubscriberConfirmToken,
  setRuntimeAdminSubscriberUnsubscribed,
} = await import("./runtime-data");

describe("reportRuntimeComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rest.insertRows.mockResolvedValue([]);
    rest.updateRows.mockResolvedValue([]);
  });

  it("counts only pending reports before auto-hiding", async () => {
    rest.selectCount.mockResolvedValue(2);

    await reportRuntimeComment(42, "user-1", "spam");

    expect(rest.insertRows).toHaveBeenCalledWith(
      "comment_reports",
      { comment_id: 42, user_id: "user-1", reason: "spam" },
      { returning: false },
    );
    expect(rest.selectCount).toHaveBeenCalledWith("comment_reports", {
      select: "id",
      comment_id: "eq.42",
      reviewed_at: "is.null",
    });
    expect(rest.updateRows).not.toHaveBeenCalled();
  });

  it("auto-hides after the third pending report", async () => {
    rest.selectCount.mockResolvedValue(3);

    await reportRuntimeComment(42, null);

    expect(rest.updateRows).toHaveBeenCalledWith(
      "comments",
      { id: "eq.42" },
      { is_hidden: true },
      { returning: false },
    );
  });
});

describe("deleteRuntimeAdminArticle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rest.deleteRows.mockResolvedValue(undefined);
  });

  it("deletes only draft articles", async () => {
    await deleteRuntimeAdminArticle(42);

    expect(rest.deleteRows).toHaveBeenCalledWith("articles", {
      id: "eq.42",
      status: "eq.draft",
    });
  });
});

describe("admin subscriber runtime helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rest.selectRowsWithCount.mockResolvedValue({ rows: [], total: 0 });
    rest.updateRows.mockResolvedValue([{ id: 42 }]);
  });

  it("queries subscribers with admin filters and pagination", async () => {
    rest.selectRowsWithCount.mockResolvedValue({
      rows: [
        {
          id: 1,
          email: "subscriber@example.com",
          whatsapp_number: "+628123456789",
          locale: "id",
          source: "home",
          consent_marketing: true,
          consent_at: "2026-01-01T00:00:00.000Z",
          ip: "203.0.113.10",
          country: "ID",
          user_agent: "Test UA",
          confirmed_at: null,
          gift_sent: false,
          gift_sent_at: null,
          unsubscribed_at: null,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      total: 1,
    });

    const result = await getRuntimeAdminSubscribers({
      query: "subscriber",
      status: "active",
      confirmation: "unconfirmed",
      channel: "whatsapp",
      locale: "id",
      page: 2,
      pageSize: 10,
    });

    expect(rest.selectRowsWithCount).toHaveBeenCalledWith("subscribers", expect.objectContaining({
      confirmed_at: "is.null",
      limit: 10,
      locale: "eq.id",
      offset: 10,
      order: "created_at.desc",
      unsubscribed_at: "is.null",
      whatsapp_number: "not.is.null",
    }));
    expect(result.subscribers[0]).toEqual(expect.objectContaining({
      id: 1,
      email: "subscriber@example.com",
      whatsappNumber: "+628123456789",
      confirmedAt: null,
    }));
  });

  it("marks a subscriber unsubscribed and disables marketing consent", async () => {
    await expect(setRuntimeAdminSubscriberUnsubscribed(42, true)).resolves.toBe(true);

    expect(rest.updateRows).toHaveBeenCalledWith(
      "subscribers",
      { id: "eq.42", unsubscribed_at: "is.null", select: "id" },
      { unsubscribed_at: expect.any(String), consent_marketing: false },
    );
  });

  it("restores a subscriber by clearing unsubscribed_at and renewing consent_at", async () => {
    await expect(setRuntimeAdminSubscriberUnsubscribed(42, false)).resolves.toBe(true);

    expect(rest.updateRows).toHaveBeenCalledWith(
      "subscribers",
      { id: "eq.42", unsubscribed_at: "not.is.null", select: "id" },
      { unsubscribed_at: null, consent_marketing: true, consent_at: expect.any(String) },
    );
  });

  it("updates a missing confirmation token for admin resend", async () => {
    await setRuntimeAdminSubscriberConfirmToken(42, "token-1");

    expect(rest.updateRows).toHaveBeenCalledWith(
      "subscribers",
      { id: "eq.42" },
      { confirm_token: "token-1" },
      { returning: false },
    );
  });
});

describe("saveRuntimePushSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rest.upsertRows.mockResolvedValue([]);
  });

  it("preserves existing topic preferences when no topics are provided", async () => {
    await saveRuntimePushSubscription({
      endpoint: "https://push.example/sub-1",
      keys: { p256dh: "p256dh", auth: "auth" },
      userId: "user-1",
      locale: "th",
      userAgent: "Test UA",
    });

    expect(rest.upsertRows).toHaveBeenCalledWith(
      "push_subscriptions",
      {
        endpoint: "https://push.example/sub-1",
        keys: { p256dh: "p256dh", auth: "auth" },
        user_id: "user-1",
        locale: "th",
        user_agent: "Test UA",
        failure_count: 0,
      },
      "endpoint",
      { returning: false },
    );
  });

  it("persists explicit topic choices including false values", async () => {
    await saveRuntimePushSubscription({
      endpoint: "https://push.example/sub-1",
      keys: { p256dh: "p256dh", auth: "auth" },
      topics: { kickoff: false, goals: true, predictionResult: false },
    });

    expect(rest.upsertRows).toHaveBeenCalledWith(
      "push_subscriptions",
      expect.objectContaining({
        kickoff: false,
        goals: true,
        prediction_result: false,
      }),
      "endpoint",
      { returning: false },
    );
  });
});

describe("admin match runtime helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    rest.selectRowsWithCount.mockResolvedValue({ rows: [], total: 0 });
    rest.selectRows.mockResolvedValue([]);
    rest.updateRows.mockResolvedValue([]);
  });

  it("queries matches with admin filters, teams, and event counts", async () => {
    rest.selectRowsWithCount.mockResolvedValue({
      rows: [
        {
          id: 10,
          api_id: 10010,
          slug: "argentina-vs-brazil",
          round: "Group stage",
          group_name: "Group A",
          stage: "Group",
          kickoff_at: "2026-06-10T20:00:00.000Z",
          venue: "Test Stadium",
          city: "Test City",
          status: "live",
          home_goals: 1,
          away_goals: 0,
          elapsed: 55,
          home_team_id: 1,
          away_team_id: 2,
          updated_at: "2026-06-10T21:00:00.000Z",
          notified_kickoff_at: null,
          premium_emailed_at: null,
        },
      ],
      total: 1,
    });
    rest.selectRows.mockImplementation((table: string) => {
      if (table === "teams") {
        return Promise.resolve([
          { id: 1, name: "Argentina", slug: "argentina", logo: null, code: "ARG" },
          { id: 2, name: "Brazil", slug: "brazil", logo: null, code: "BRA" },
        ]);
      }
      if (table === "fixture_events") {
        return Promise.resolve([
          { id: 1, fixture_id: 10 },
          { id: 2, fixture_id: 10 },
        ]);
      }
      return Promise.resolve([]);
    });

    const result = await getRuntimeAdminMatches({
      query: "argentina",
      status: "live",
      window: "all",
      group: "Group A",
      page: 2,
      pageSize: 10,
    });

    expect(rest.selectRowsWithCount).toHaveBeenCalledWith("fixtures", expect.objectContaining({
      group_name: "eq.Group A",
      limit: 10,
      offset: 10,
      order: "kickoff_at.asc",
      or: "(slug.ilike.*argentina*,round.ilike.*argentina*,stage.ilike.*argentina*,group_name.ilike.*argentina*,venue.ilike.*argentina*,city.ilike.*argentina*)",
      status: "eq.live",
    }));
    expect(rest.selectRows).toHaveBeenCalledWith("fixture_events", expect.objectContaining({
      fixture_id: "in.(10)",
    }));
    expect(result.matches[0]).toEqual(expect.objectContaining({
      id: 10,
      status: "live",
      eventCount: 2,
      home: expect.objectContaining({ name: "Argentina" }),
      away: expect.objectContaining({ name: "Brazil" }),
    }));
  });

  it("adds admin match date window filters", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T12:00:00.000Z"));

    await getRuntimeAdminMatches({ window: "upcoming", pageSize: 5 });

    expect(rest.selectRowsWithCount).toHaveBeenLastCalledWith("fixtures", expect.objectContaining({
      kickoff_at: "gte.2026-06-10T09:00:00.000Z",
      limit: 5,
      order: "kickoff_at.asc",
    }));

    await getRuntimeAdminMatches({ window: "past", pageSize: 5 });

    expect(rest.selectRowsWithCount).toHaveBeenLastCalledWith("fixtures", expect.objectContaining({
      kickoff_at: "lt.2026-06-10T12:00:00.000Z",
      limit: 5,
      order: "kickoff_at.desc",
    }));
  });

  it("sanitizes admin match search before building the PostgREST or filter", async () => {
    await getRuntimeAdminMatches({ query: "arg*(a),_%", window: "all" });

    expect(rest.selectRowsWithCount).toHaveBeenCalledWith("fixtures", expect.objectContaining({
      or: "(slug.ilike.*arg a*,round.ilike.*arg a*,stage.ilike.*arg a*,group_name.ilike.*arg a*,venue.ilike.*arg a*,city.ilike.*arg a*)",
    }));
  });

  it("updates only match status and updated_at", async () => {
    await setRuntimeAdminMatchStatus(42, "finished");

    expect(rest.updateRows).toHaveBeenCalledWith(
      "fixtures",
      { id: "eq.42" },
      { status: "finished", updated_at: expect.any(String) },
      { returning: false },
    );
  });
});

describe("admin media runtime helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rest.selectRowsWithCount.mockResolvedValue({ rows: [], total: 0 });
    rest.selectRows.mockResolvedValue([]);
    rest.updateRows.mockResolvedValue([{ id: 55 }]);
    rest.deleteRows.mockResolvedValue(undefined);
  });

  it("queries media rows with filters, pagination, and fixture context", async () => {
    rest.selectRowsWithCount.mockResolvedValue({
      rows: [
        {
          id: 55,
          team: "Argentina",
          category: "prematch_poster",
          url: "https://cdn.example.com/poster.jpg",
          fixture_id: 10,
          kind: "prematch_poster",
          variant: "star",
          prompt: "Poster prompt",
          status: "ready",
          created_at: "2026-06-01T00:00:00.000Z",
        },
      ],
      total: 1,
    });
    rest.selectRows.mockImplementation((table: string) => {
      if (table === "fixtures") {
        return Promise.resolve([
          {
            id: 10,
            api_id: 10010,
            slug: "argentina-vs-brazil",
            round: "Group stage",
            group_name: "Group A",
            stage: "Group",
            kickoff_at: "2026-06-10T20:00:00.000Z",
            venue: "Test Stadium",
            city: "Test City",
            status: "scheduled",
            home_goals: null,
            away_goals: null,
            elapsed: null,
            home_team_id: 1,
            away_team_id: 2,
          },
        ]);
      }
      if (table === "teams") {
        return Promise.resolve([
          { id: 1, name: "Argentina", slug: "argentina", logo: null, code: "ARG" },
          { id: 2, name: "Brazil", slug: "brazil", logo: null, code: "BRA" },
        ]);
      }
      return Promise.resolve([]);
    });

    const result = await getRuntimeAdminMedia({
      query: "poster",
      status: "ready",
      kind: "prematch_poster",
      fixtureId: 10,
      page: 2,
      pageSize: 10,
    });

    expect(rest.selectRowsWithCount).toHaveBeenCalledWith("image_library", expect.objectContaining({
      fixture_id: "eq.10",
      kind: "eq.prematch_poster",
      limit: 10,
      offset: 10,
      order: "created_at.desc",
      or: "(team.ilike.*poster*,category.ilike.*poster*,kind.ilike.*poster*,variant.ilike.*poster*,url.ilike.*poster*)",
      status: "eq.ready",
    }));
    expect(rest.selectRows).toHaveBeenCalledWith("fixtures", expect.objectContaining({
      id: "in.(10)",
    }));
    expect(result.images[0]).toEqual(expect.objectContaining({
      id: 55,
      status: "ready",
      fixture: expect.objectContaining({
        id: 10,
        slug: "argentina-vs-brazil",
        home: expect.objectContaining({ name: "Argentina" }),
      }),
    }));
  });

  it("sanitizes media search before building the PostgREST or filter", async () => {
    await getRuntimeAdminMedia({ query: "arg*(a),_%", pageSize: 5 });

    expect(rest.selectRowsWithCount).toHaveBeenCalledWith("image_library", expect.objectContaining({
      limit: 5,
      or: "(team.ilike.*arg a*,category.ilike.*arg a*,kind.ilike.*arg a*,variant.ilike.*arg a*,url.ilike.*arg a*)",
    }));
  });

  it("deduplicates media kinds for admin filters", async () => {
    rest.selectRows.mockResolvedValue([
      { kind: "result_card" },
      { kind: "prematch_poster" },
      { kind: "result_card" },
      { kind: null },
    ]);

    await expect(getRuntimeAdminMediaKinds()).resolves.toEqual(["prematch_poster", "result_card"]);
    expect(rest.selectRows).toHaveBeenCalledWith("image_library", {
      select: "kind",
      order: "kind.asc",
      limit: 5_000,
    });
  });

  it("loads a single media item with fixture context", async () => {
    rest.selectRows.mockImplementation((table: string) => {
      if (table === "image_library") {
        return Promise.resolve([
          {
            id: 55,
            team: null,
            category: "result_card",
            url: null,
            fixture_id: 10,
            kind: "result_card",
            variant: "star",
            prompt: "Prompt",
            status: "pending",
            created_at: "2026-06-01T00:00:00.000Z",
          },
        ]);
      }
      if (table === "fixtures") {
        return Promise.resolve([
          {
            id: 10,
            api_id: 10010,
            slug: "argentina-vs-brazil",
            round: "Group stage",
            group_name: "Group A",
            stage: "Group",
            kickoff_at: "2026-06-10T20:00:00.000Z",
            venue: "Test Stadium",
            city: "Test City",
            status: "finished",
            home_goals: 2,
            away_goals: 1,
            elapsed: 90,
            home_team_id: 1,
            away_team_id: 2,
          },
        ]);
      }
      if (table === "teams") {
        return Promise.resolve([
          { id: 1, name: "Argentina", slug: "argentina", logo: null, code: "ARG" },
          { id: 2, name: "Brazil", slug: "brazil", logo: null, code: "BRA" },
        ]);
      }
      return Promise.resolve([]);
    });

    const result = await getRuntimeAdminMediaItem(55);

    expect(result).toEqual(expect.objectContaining({
      id: 55,
      kind: "result_card",
      fixture: expect.objectContaining({ status: "finished" }),
    }));
  });

  it("updates media URL and marks the row ready", async () => {
    await setRuntimeAdminMediaUrl(55, "https://cdn.example.com/poster.jpg");

    expect(rest.updateRows).toHaveBeenCalledWith(
      "image_library",
      { id: "eq.55" },
      { url: "https://cdn.example.com/poster.jpg", status: "ready" },
      { returning: false },
    );
  });

  it("retries only media rows that still have a prompt", async () => {
    await expect(retryRuntimeAdminMediaItem(55)).resolves.toBe(true);

    expect(rest.updateRows).toHaveBeenCalledWith(
      "image_library",
      { id: "eq.55", prompt: "not.is.null", select: "id" },
      { status: "pending", url: null },
    );
  });

  it("deletes media rows by id", async () => {
    await deleteRuntimeAdminMediaItem(55);

    expect(rest.deleteRows).toHaveBeenCalledWith("image_library", { id: "eq.55" });
  });
});
