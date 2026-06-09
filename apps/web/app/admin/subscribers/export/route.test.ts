import { beforeEach, describe, expect, it, vi } from "vitest";

const admin = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
}));

const runtime = vi.hoisted(() => ({
  getRuntimeAdminSubscriberExportRows: vi.fn(),
}));

vi.mock("@/lib/admin", () => admin);
vi.mock("@/lib/runtime-data", () => runtime);

const { GET } = await import("./route");

describe("admin subscriber export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    admin.requireAdmin.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { role: "admin" },
    });
    runtime.getRuntimeAdminSubscriberExportRows.mockResolvedValue([
      {
        id: 1,
        email: "subscriber@example.com",
        whatsappNumber: "+628123456789",
        locale: "id",
        source: "=IMPORTXML(\"https://example.com\")",
        country: "-ID",
        consentMarketing: true,
        consentAt: new Date("2026-01-01T00:00:00.000Z"),
        confirmedAt: null,
        giftSent: false,
        giftSentAt: null,
        unsubscribedAt: null,
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);
  });

  it("requires admin and exports formula-safe CSV without browser caching", async () => {
    const response = await GET(new Request("https://skorly.test/admin/subscribers/export?status=active"));
    const body = await response.text();

    expect(admin.requireAdmin).toHaveBeenCalled();
    expect(runtime.getRuntimeAdminSubscriberExportRows).toHaveBeenCalledWith({
      query: undefined,
      status: "active",
      confirmation: undefined,
      channel: undefined,
      locale: undefined,
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toContain("'+628123456789");
    expect(body).toContain("\"'=IMPORTXML(\"\"https://example.com\"\")\"");
    expect(body).toContain("'-ID");
  });
});
