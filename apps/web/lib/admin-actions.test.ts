import { beforeEach, describe, expect, it, vi } from "vitest";

const admin = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
}));

const runtime = vi.hoisted(() => ({
  countRuntimeActiveAdmins: vi.fn(),
  deleteRuntimeAdminArticle: vi.fn(),
  getRuntimeAdminArticle: vi.fn(),
  getRuntimeAdminUserBasic: vi.fn(),
  insertRuntimeAdminAuditLog: vi.fn(),
  markRuntimeAdminCommentReportsReviewed: vi.fn(),
  setRuntimeAdminArticleStatus: vi.fn(),
  setRuntimeAdminCommentHidden: vi.fn(),
  setRuntimeAdminUserDeleted: vi.fn(),
  setRuntimeAdminUserRole: vi.fn(),
  updateRuntimeAdminArticle: vi.fn(),
  updateRuntimeAdminAuditLogMeta: vi.fn(),
}));

const cache = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => cache);
vi.mock("./admin", () => admin);
vi.mock("./runtime-data", () => runtime);

const {
  deleteAdminArticle,
  setAdminArticleStatus,
  setAdminUserDeleted,
  setAdminUserRole,
  updateAdminArticle,
} = await import("./admin-actions");

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

function article(status = "draft") {
  return {
    id: 42,
    slug: "argentina-vs-brazil-preview",
    locale: "id",
    type: "preview",
    title: "Argentina vs Brazil preview",
    summary: "Match preview",
    bodyExcerpt: "Match preview",
    body: "Existing article body",
    fixtureId: 10,
    teamId: null,
    groupName: null,
    topicId: null,
    imageUrl: null,
    status,
    qualityScore: null,
    model: null,
    publishedAt: status === "published" ? new Date("2026-06-01T10:00:00.000Z") : null,
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    updatedAt: new Date("2026-05-02T10:00:00.000Z"),
  };
}

describe("admin user management actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    admin.requireAdmin.mockResolvedValue(actor);
    runtime.getRuntimeAdminUserBasic.mockResolvedValue(user());
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
    runtime.getRuntimeAdminUserBasic.mockResolvedValue(user("admin", actor.user.id));

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

  it("prevents an admin from deactivating themselves", async () => {
    runtime.getRuntimeAdminUserBasic.mockResolvedValue(user("admin", actor.user.id));

    const result = await setAdminUserDeleted(actor.user.id, true, {
      confirmAdminChange: true,
    });

    expect(result).toEqual({
      ok: false,
      userId: actor.user.id,
      action: "deactivate",
      error: "selfAdmin",
    });
    expect(runtime.setRuntimeAdminUserDeleted).not.toHaveBeenCalled();
  });

  it("writes audit logs around a normal role update", async () => {
    const target = user("member");
    runtime.getRuntimeAdminUserBasic.mockResolvedValue(target);

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
    runtime.getRuntimeAdminUserBasic.mockResolvedValue(target);
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

  it("returns an action for invalid status changes", async () => {
    const result = await setAdminUserDeleted("not-a-uuid", true);

    expect(result).toEqual({
      ok: false,
      userId: "not-a-uuid",
      action: "deactivate",
      error: "invalid",
    });
    expect(admin.requireAdmin).not.toHaveBeenCalled();
  });
});

describe("admin article management actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    admin.requireAdmin.mockResolvedValue(actor);
    runtime.getRuntimeAdminArticle.mockResolvedValue(article());
    runtime.insertRuntimeAdminAuditLog.mockResolvedValue(321);
    runtime.setRuntimeAdminArticleStatus.mockResolvedValue(undefined);
    runtime.updateRuntimeAdminArticle.mockResolvedValue(undefined);
    runtime.deleteRuntimeAdminArticle.mockResolvedValue(undefined);
    runtime.updateRuntimeAdminAuditLogMeta.mockResolvedValue(undefined);
  });

  it("publishes a draft article with an audited status update and publishedAt", async () => {
    const target = article("draft");
    runtime.getRuntimeAdminArticle.mockResolvedValue(target);

    const result = await setAdminArticleStatus(target.id, "published");

    expect(result).toEqual({ ok: true, articleId: target.id, action: "status" });
    expect(runtime.insertRuntimeAdminAuditLog).toHaveBeenCalledWith({
      actorId: actor.user.id,
      action: "articles.status.set",
      target: `article:${target.id}`,
      meta: expect.objectContaining({
        articleId: target.id,
        slug: target.slug,
        locale: target.locale,
        fromStatus: "draft",
        toStatus: "published",
        fromPublishedAt: null,
        toPublishedAt: expect.any(String),
      }),
    });
    expect(runtime.setRuntimeAdminArticleStatus).toHaveBeenCalledWith(
      target.id,
      "published",
      expect.any(String),
    );
    expect(runtime.updateRuntimeAdminAuditLogMeta).toHaveBeenCalledWith(
      321,
      expect.objectContaining({ status: "succeeded", fromStatus: "draft", toStatus: "published" }),
    );
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admin/content");
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/${target.locale}/artikel/${target.slug}`);
  });

  it("updates article fields without writing body text into audit metadata", async () => {
    const target = article("draft");
    runtime.getRuntimeAdminArticle.mockResolvedValue(target);

    const result = await updateAdminArticle(target.id, {
      title: "Updated title",
      summary: "Updated summary",
      body: "Updated body",
      imageUrl: "https://example.com/cover.jpg",
      status: "published",
      publishedAt: "2026-06-09T12:00:00.000Z",
    });

    expect(result).toEqual({ ok: true, articleId: target.id, action: "update" });
    expect(runtime.updateRuntimeAdminArticle).toHaveBeenCalledWith(target.id, {
      title: "Updated title",
      summary: "Updated summary",
      body: "Updated body",
      imageUrl: "https://example.com/cover.jpg",
      status: "published",
      publishedAt: "2026-06-09T12:00:00.000Z",
    });
    const auditInput = runtime.insertRuntimeAdminAuditLog.mock.calls[0]?.[0];
    expect(auditInput.meta.changedFields).toEqual([
      "title",
      "summary",
      "body",
      "imageUrl",
      "status",
      "publishedAt",
    ]);
    expect(JSON.stringify(auditInput.meta)).not.toContain("Updated body");
  });

  it("requires explicit confirmation before deleting a draft article", async () => {
    const target = article("draft");
    runtime.getRuntimeAdminArticle.mockResolvedValue(target);

    const result = await deleteAdminArticle(target.id);

    expect(result).toEqual({
      ok: false,
      articleId: target.id,
      action: "delete",
      error: "confirmDelete",
    });
    expect(runtime.insertRuntimeAdminAuditLog).not.toHaveBeenCalled();
    expect(runtime.deleteRuntimeAdminArticle).not.toHaveBeenCalled();
  });

  it("blocks hard deletion of published articles", async () => {
    const target = article("published");
    runtime.getRuntimeAdminArticle.mockResolvedValue(target);

    const result = await deleteAdminArticle(target.id, { confirmDelete: true });

    expect(result).toEqual({
      ok: false,
      articleId: target.id,
      action: "delete",
      error: "publishedDelete",
    });
    expect(runtime.deleteRuntimeAdminArticle).not.toHaveBeenCalled();
  });

  it("writes audit logs around a confirmed draft article delete", async () => {
    const target = article("draft");
    runtime.getRuntimeAdminArticle.mockResolvedValue(target);

    const result = await deleteAdminArticle(target.id, { confirmDelete: true });

    expect(result).toEqual({ ok: true, articleId: target.id, action: "delete" });
    expect(runtime.insertRuntimeAdminAuditLog).toHaveBeenCalledWith({
      actorId: actor.user.id,
      action: "articles.delete",
      target: `article:${target.id}`,
      meta: expect.objectContaining({
        articleId: target.id,
        title: target.title,
        articleStatus: "draft",
      }),
    });
    expect(runtime.deleteRuntimeAdminArticle).toHaveBeenCalledWith(target.id);
    expect(runtime.updateRuntimeAdminAuditLogMeta).toHaveBeenCalledWith(
      321,
      expect.objectContaining({ status: "succeeded", title: target.title }),
    );
  });
});
