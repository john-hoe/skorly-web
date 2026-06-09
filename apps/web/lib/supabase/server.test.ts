import { beforeEach, describe, expect, it, vi } from "vitest";

const ssr = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

const headers = vi.hoisted(() => ({
  cookies: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ssr);
vi.mock("next/headers", () => headers);
vi.mock("./cookies", () => ({
  supabaseAuthCookieOptions: {},
  withSupabaseAuthCookieOptions: (options: unknown) => options,
}));

const { getSessionUser } = await import("./server");

function supabaseClient(profile: { deleted_at: string | null } | null, profileError: Error | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: profile, error: profileError });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "00000000-0000-4000-8000-000000000001", email: "admin@example.com" } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({ select }),
    _profile: { select, eq, maybeSingle },
  };
}

describe("getSessionUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headers.cookies.mockResolvedValue({
      getAll: vi.fn().mockReturnValue([]),
      set: vi.fn(),
    });
  });

  it("returns active users", async () => {
    const client = supabaseClient({ deleted_at: null });
    ssr.createServerClient.mockReturnValue(client);

    const user = await getSessionUser();

    expect(user?.id).toBe("00000000-0000-4000-8000-000000000001");
    expect(client.from).toHaveBeenCalledWith("profiles");
    expect(client._profile.select).toHaveBeenCalledWith("deleted_at");
  });

  it("treats deactivated users as logged out by default", async () => {
    const client = supabaseClient({ deleted_at: "2026-06-09T00:00:00.000Z" });
    ssr.createServerClient.mockReturnValue(client);

    await expect(getSessionUser()).resolves.toBeNull();
  });

  it("can include deactivated users for admin gate checks", async () => {
    const client = supabaseClient({ deleted_at: "2026-06-09T00:00:00.000Z" });
    ssr.createServerClient.mockReturnValue(client);

    const user = await getSessionUser({ includeDeactivated: true });

    expect(user?.id).toBe("00000000-0000-4000-8000-000000000001");
    expect(client.from).not.toHaveBeenCalled();
  });

  it("fails closed when profile status cannot be checked", async () => {
    const client = supabaseClient(null, new Error("profile lookup failed"));
    ssr.createServerClient.mockReturnValue(client);

    await expect(getSessionUser()).resolves.toBeNull();
  });
});
