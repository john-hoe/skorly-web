import { beforeEach, describe, expect, it, vi } from "vitest";

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
  deleteRuntimeAdminArticle,
  getRuntimeAdminSubscribers,
  reportRuntimeComment,
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
