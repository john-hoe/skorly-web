import { beforeEach, describe, expect, it, vi } from "vitest";

const rest = vi.hoisted(() => ({
  callRpc: vi.fn(),
  deleteRows: vi.fn(),
  insertRows: vi.fn(),
  selectCount: vi.fn(),
  selectRows: vi.fn(),
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

const { reportRuntimeComment } = await import("./runtime-data");

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
