import { beforeEach, describe, expect, it, vi } from "vitest";

const admin = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
}));

const runtime = vi.hoisted(() => ({
  countRuntimeActiveAdmins: vi.fn(),
  getRuntimeAdminUser: vi.fn(),
  insertRuntimeAdminAuditLog: vi.fn(),
  markRuntimeAdminCommentReportsReviewed: vi.fn(),
  setRuntimeAdminCommentHidden: vi.fn(),
  setRuntimeAdminUserDeleted: vi.fn(),
  setRuntimeAdminUserRole: vi.fn(),
  updateRuntimeAdminAuditLogMeta: vi.fn(),
}));

const cache = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => cache);
vi.mock("./admin", () => admin);
vi.mock("./runtime-data", () => runtime);

const { setAdminUserDeleted, setAdminUserRole } = await import("./admin-actions");

const actor = {
  user: { id: "00000000-0000-4000-8000-000000000001" },
  profile: { role: "admin" },
};

function user(role = "member", id = "00000000-0000-4000-8000-000000000002") {
  return {
    id,
    email: "user@example.com",
    displayName: "User",
    avatarUrl: null,
    whatsappNumber: null,
    locale: "id",
    role,
    consentMarketing: false,
    consentAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    deletedAt: null,
    activity: {
      predictions: 0,
      comments: 0,
      pushSubscriptions: 0,
      subscriberMatches: 0,
    },
  };
}

describe("admin user management actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    admin.requireAdmin.mockResolvedValue(actor);
    runtime.getRuntimeAdminUser.mockResolvedValue(user());
    runtime.countRuntimeActiveAdmins.mockResolvedValue(2);
    runtime.insertRuntimeAdminAuditLog.mockResolvedValue(123);
    runtime.setRuntimeAdminUserRole.mockResolvedValue(undefined);
    runtime.setRuntimeAdminUserDeleted.mockResolvedValue(undefined);
    runtime.updateRuntimeAdminAuditLogMeta.mockResolvedValue(undefined);
  });

  it("requires explicit confirmation for admin role changes", async () => {
    const result = await setAdminUserRole(user().id, "admin");

    expect(result).toEqual({
      ok: false,
      userId: user().id,
      action: "role",
      error: "confirmAdmin",
    });
    expect(runtime.insertRuntimeAdminAuditLog).not.toHaveBeenCalled();
    expect(runtime.setRuntimeAdminUserRole).not.toHaveBeenCalled();
  });

  it("prevents an admin from demoting themselves", async () => {
    runtime.getRuntimeAdminUser.mockResolvedValue(user("admin", actor.user.id));

    const result = await setAdminUserRole(actor.user.id, "member", {
      confirmAdminChange: true,
    });

    expect(result).toEqual({
      ok: false,
      userId: actor.user.id,
      action: "role",
      error: "selfAdmin",
    });
    expect(runtime.setRuntimeAdminUserRole).not.toHaveBeenCalled();
  });

  it("writes audit logs around a normal role update", async () => {
    const target = user("member");
    runtime.getRuntimeAdminUser.mockResolvedValue(target);

    const result = await setAdminUserRole(target.id, "premium");

    expect(result).toEqual({ ok: true, userId: target.id, action: "role" });
    expect(runtime.insertRuntimeAdminAuditLog).toHaveBeenCalledWith({
      actorId: actor.user.id,
      action: "users.role.set",
      target: `user:${target.id}`,
      meta: expect.objectContaining({ fromRole: "member", toRole: "premium" }),
    });
    expect(runtime.setRuntimeAdminUserRole).toHaveBeenCalledWith(target.id, "premium");
    expect(runtime.updateRuntimeAdminAuditLogMeta).toHaveBeenCalledWith(
      123,
      expect.objectContaining({ status: "succeeded", fromRole: "member", toRole: "premium" }),
    );
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admin/users");
  });

  it("prevents deactivating the last active admin", async () => {
    const target = user("admin");
    runtime.getRuntimeAdminUser.mockResolvedValue(target);
    runtime.countRuntimeActiveAdmins.mockResolvedValue(1);

    const result = await setAdminUserDeleted(target.id, true, {
      confirmAdminChange: true,
    });

    expect(result).toEqual({
      ok: false,
      userId: target.id,
      action: "deactivate",
      error: "lastAdmin",
    });
    expect(runtime.setRuntimeAdminUserDeleted).not.toHaveBeenCalled();
  });
});
