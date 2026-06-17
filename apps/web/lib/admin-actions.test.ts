import { beforeEach, describe, expect, it, vi } from "vitest";

const admin = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
}));

const runtime = vi.hoisted(() => ({
  countRuntimeActiveAdmins: vi.fn(),
  deleteRuntimeAdminArticle: vi.fn(),
  deleteRuntimeAdminMediaItem: vi.fn(),
  getRuntimeAdminArticle: vi.fn(),
  getRuntimeAdminMatch: vi.fn(),
  getRuntimeAdminMediaItem: vi.fn(),
  getRuntimeAdminSubscriberBasic: vi.fn(),
  getRuntimeAdminUserBasic: vi.fn(),
  insertRuntimeAdminAuditLog: vi.fn(),
  markRuntimeAdminCommentReportsReviewed: vi.fn(),
  retryRuntimeAdminMediaItem: vi.fn(),
  setRuntimeAdminArticleStatus: vi.fn(),
  setRuntimeAdminMatchStatus: vi.fn(),
  setRuntimeAdminMediaUrl: vi.fn(),
  setRuntimeAdminSubscriberConfirmToken: vi.fn(),
  setRuntimeAdminSubscriberUnsubscribed: vi.fn(),
  setRuntimeAdminCommentHidden: vi.fn(),
  setRuntimeAdminUserDeleted: vi.fn(),
  setRuntimeAdminUserRole: vi.fn(),
  updateRuntimeAdminArticle: vi.fn(),
  updateRuntimeAdminAuditLogMeta: vi.fn(),
}));

const cache = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

const email = vi.hoisted(() => ({
  optInEmail: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("next/cache", () => cache);
vi.mock("./admin", () => admin);
vi.mock("./email", () => email);
vi.mock("./runtime-data", () => runtime);
vi.mock("./seo", () => ({ SITE_URL: "https://skorly.test" }));

const {
  deleteAdminArticle,
  deleteAdminMediaItem,
  resendAdminSubscriberConfirmation,
  retryAdminMediaItem,
  setAdminArticleStatus,
  setAdminMatchStatus,
  setAdminMediaUrl,
  setAdminSubscriberUnsubscribed,
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

type TestSubscriber = {
  id: number;
  email: string;
  whatsappNumber: string | null;
  locale: string;
  source: string | null;
  consentMarketing: boolean;
  consentAt: Date | null;
  country: string | null;
  ip: string | null;
  userAgent: string | null;
  confirmedAt: Date | null;
  confirmToken: string | null;
  giftSent: boolean;
  giftSentAt: Date | null;
  unsubscribedAt: Date | null;
  createdAt: Date | null;
};

function subscriber(overrides: Partial<TestSubscriber> = {}): TestSubscriber {
  return { ...subscriberBase(), ...overrides };
}

function subscriberBase(): TestSubscriber {
  return {
    id: 77,
    email: "subscriber@example.com",
    whatsappNumber: "+628123456789",
    locale: "id",
    source: "home",
    consentMarketing: true,
    consentAt: new Date("2026-01-01T00:00:00.000Z"),
    country: "ID",
    ip: "203.0.113.10",
    userAgent: "Test UA",
    confirmedAt: null,
    confirmToken: "confirm-token",
    giftSent: false,
    giftSentAt: null,
    unsubscribedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function match(status = "scheduled") {
  return {
    id: 88,
    apiId: 10088,
    slug: "argentina-vs-brazil",
    round: "Group stage",
    groupName: "Group A",
    stage: "Group",
    kickoffAt: new Date("2026-06-10T20:00:00.000Z"),
    venue: "Test Stadium",
    city: "Test City",
    status,
    homeGoals: null,
    awayGoals: null,
    elapsed: null,
    homeTeamId: 1,
    awayTeamId: 2,
    home: { id: 1, name: "Argentina", slug: "argentina", logo: null, code: "ARG" },
    away: { id: 2, name: "Brazil", slug: "brazil", logo: null, code: "BRA" },
    updatedAt: new Date("2026-06-10T19:00:00.000Z"),
    notifiedKickoffAt: null,
    premiumEmailedAt: null,
    eventCount: 0,
  };
}

type TestMedia = {
  id: number;
  team: string | null;
  category: string;
  url: string | null;
  fixtureId: number | null;
  fixture: {
    id: number;
    slug: string;
    kickoffAt: Date | null;
    status: string;
    home: { id: number | null; name: string; slug: string; logo: string | null; code: string | null };
    away: { id: number | null; name: string; slug: string; logo: string | null; code: string | null };
  } | null;
  kind: string;
  variant: string | null;
  prompt: string | null;
  status: string;
  createdAt: Date | null;
};

function media(overrides: Partial<TestMedia> = {}): TestMedia {
  return { ...mediaBase(), ...overrides };
}

function mediaBase(): TestMedia {
  return {
    id: 55,
    team: "Argentina",
    category: "prematch_poster",
    url: "https://cdn.example.com/old.jpg",
    fixtureId: 88,
    fixture: {
      id: 88,
      slug: "argentina-vs-brazil",
      kickoffAt: new Date("2026-06-10T20:00:00.000Z"),
      status: "scheduled",
      home: { id: 1, name: "Argentina", slug: "argentina", logo: null, code: "ARG" },
      away: { id: 2, name: "Brazil", slug: "brazil", logo: null, code: "BRA" },
    },
    kind: "prematch_poster",
    variant: "star",
    prompt: "A long poster prompt that should not be copied into audit metadata",
    status: "ready",
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
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

describe("admin subscriber management actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    admin.requireAdmin.mockResolvedValue(actor);
    runtime.getRuntimeAdminSubscriberBasic.mockResolvedValue(subscriber());
    runtime.insertRuntimeAdminAuditLog.mockResolvedValue(456);
    runtime.setRuntimeAdminSubscriberConfirmToken.mockResolvedValue(undefined);
    runtime.setRuntimeAdminSubscriberUnsubscribed.mockResolvedValue(true);
    runtime.updateRuntimeAdminAuditLogMeta.mockResolvedValue(undefined);
    email.optInEmail.mockReturnValue({ subject: "Confirm", html: "<p>Confirm</p>" });
    email.sendEmail.mockResolvedValue(true);
  });

  it("requires explicit confirmation before restoring marketing consent", async () => {
    const target = subscriber({ unsubscribedAt: new Date("2026-02-01T00:00:00.000Z"), consentMarketing: false });
    runtime.getRuntimeAdminSubscriberBasic.mockResolvedValue(target);

    const result = await setAdminSubscriberUnsubscribed(target.id, false);

    expect(result).toEqual({
      ok: false,
      subscriberId: target.id,
      action: "restore",
      error: "confirmRestore",
    });
    expect(runtime.insertRuntimeAdminAuditLog).not.toHaveBeenCalled();
    expect(runtime.setRuntimeAdminSubscriberUnsubscribed).not.toHaveBeenCalled();
  });

  it("writes audited unsubscribe updates without storing full contact values in audit metadata", async () => {
    const target = subscriber();
    runtime.getRuntimeAdminSubscriberBasic.mockResolvedValue(target);

    const result = await setAdminSubscriberUnsubscribed(target.id, true);

    expect(result).toEqual({ ok: true, subscriberId: target.id, action: "unsubscribe" });
    expect(runtime.insertRuntimeAdminAuditLog).toHaveBeenCalledWith({
      actorId: actor.user.id,
      action: "subscribers.unsubscribe",
      target: `subscriber:${target.id}`,
      meta: expect.objectContaining({
        subscriberId: target.id,
        locale: target.locale,
        confirmed: false,
        hasWhatsapp: true,
        toUnsubscribed: true,
      }),
    });
    const auditInput = runtime.insertRuntimeAdminAuditLog.mock.calls[0]?.[0];
    expect(JSON.stringify(auditInput.meta)).not.toContain(target.email);
    expect(JSON.stringify(auditInput.meta)).not.toContain(target.whatsappNumber);
    expect(runtime.setRuntimeAdminSubscriberUnsubscribed).toHaveBeenCalledWith(target.id, true);
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admin/subscribers");
  });

  it("reports an upstream failure when subscriber state changes before the write", async () => {
    const target = subscriber();
    runtime.getRuntimeAdminSubscriberBasic.mockResolvedValue(target);
    runtime.setRuntimeAdminSubscriberUnsubscribed.mockResolvedValue(false);

    const result = await setAdminSubscriberUnsubscribed(target.id, true);

    expect(result).toEqual({
      ok: false,
      subscriberId: target.id,
      action: "unsubscribe",
      error: "upstream",
      response: "Subscriber state changed before update",
    });
    expect(runtime.updateRuntimeAdminAuditLogMeta).toHaveBeenCalledWith(
      456,
      expect.objectContaining({
        status: "failed",
        toUnsubscribed: true,
        error: "Subscriber state changed before update",
      }),
    );
  });

  it("resends confirmation email with the existing double opt-in token", async () => {
    const target = subscriber({ confirmToken: "existing-token" });
    runtime.getRuntimeAdminSubscriberBasic.mockResolvedValue(target);

    const result = await resendAdminSubscriberConfirmation(target.id);

    expect(result).toEqual({ ok: true, subscriberId: target.id, action: "resendConfirm" });
    expect(runtime.setRuntimeAdminSubscriberConfirmToken).not.toHaveBeenCalled();
    expect(email.optInEmail).toHaveBeenCalledWith(
      target.locale,
      "https://skorly.test/api/subscribe/confirm?token=existing-token&l=id",
    );
    expect(email.sendEmail).toHaveBeenCalledWith({
      to: target.email,
      subject: "Confirm",
      html: "<p>Confirm</p>",
    });
  });

  it("creates a confirmation token before resending when one is missing", async () => {
    const target = subscriber({ confirmToken: null });
    runtime.getRuntimeAdminSubscriberBasic.mockResolvedValue(target);
    const token = "00000000-0000-4000-8000-000000000077";
    const randomUUID = vi.spyOn(crypto, "randomUUID").mockReturnValue(token);

    const result = await resendAdminSubscriberConfirmation(target.id);

    expect(result).toEqual({ ok: true, subscriberId: target.id, action: "resendConfirm" });
    expect(runtime.setRuntimeAdminSubscriberConfirmToken).toHaveBeenCalledWith(target.id, token);
    expect(email.optInEmail).toHaveBeenCalledWith(
      target.locale,
      `https://skorly.test/api/subscribe/confirm?token=${token}&l=id`,
    );
    randomUUID.mockRestore();
  });

  it("does not resend confirmation to confirmed or unsubscribed subscribers", async () => {
    const confirmed = subscriber({ confirmedAt: new Date("2026-02-01T00:00:00.000Z") });
    runtime.getRuntimeAdminSubscriberBasic.mockResolvedValueOnce(confirmed);

    await expect(resendAdminSubscriberConfirmation(confirmed.id)).resolves.toEqual({
      ok: false,
      subscriberId: confirmed.id,
      action: "resendConfirm",
      error: "alreadyConfirmed",
    });

    const unsubscribed = subscriber({
      unsubscribedAt: new Date("2026-02-02T00:00:00.000Z"),
      consentMarketing: false,
    });
    runtime.getRuntimeAdminSubscriberBasic.mockResolvedValueOnce(unsubscribed);

    await expect(resendAdminSubscriberConfirmation(unsubscribed.id)).resolves.toEqual({
      ok: false,
      subscriberId: unsubscribed.id,
      action: "resendConfirm",
      error: "unsubscribed",
    });
    expect(email.sendEmail).not.toHaveBeenCalled();
  });
});

describe("admin match management actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    admin.requireAdmin.mockResolvedValue(actor);
    runtime.getRuntimeAdminMatch.mockResolvedValue(match());
    runtime.insertRuntimeAdminAuditLog.mockResolvedValue(654);
    runtime.setRuntimeAdminMatchStatus.mockResolvedValue(undefined);
    runtime.updateRuntimeAdminAuditLogMeta.mockResolvedValue(undefined);
  });

  it("requires explicit confirmation before changing fixture status", async () => {
    const target = match("scheduled");
    runtime.getRuntimeAdminMatch.mockResolvedValue(target);

    const result = await setAdminMatchStatus(target.id, "finished");

    expect(result).toEqual({
      ok: false,
      matchId: target.id,
      action: "status",
      error: "confirmStatus",
    });
    expect(runtime.insertRuntimeAdminAuditLog).not.toHaveBeenCalled();
    expect(runtime.setRuntimeAdminMatchStatus).not.toHaveBeenCalled();
  });

  it("writes audited fixture status updates", async () => {
    const target = match("scheduled");
    runtime.getRuntimeAdminMatch.mockResolvedValue(target);

    const result = await setAdminMatchStatus(target.id, "finished", { confirmStatus: true });

    expect(result).toEqual({ ok: true, matchId: target.id, action: "status" });
    expect(runtime.insertRuntimeAdminAuditLog).toHaveBeenCalledWith({
      actorId: actor.user.id,
      action: "matches.status.set",
      target: `fixture:${target.id}`,
      meta: expect.objectContaining({
        matchId: target.id,
        apiId: target.apiId,
        slug: target.slug,
        homeTeam: "Argentina",
        awayTeam: "Brazil",
        fromStatus: "scheduled",
        toStatus: "finished",
      }),
    });
    expect(runtime.setRuntimeAdminMatchStatus).toHaveBeenCalledWith(target.id, "finished");
    expect(runtime.updateRuntimeAdminAuditLogMeta).toHaveBeenCalledWith(
      654,
      expect.objectContaining({ status: "succeeded", fromStatus: "scheduled", toStatus: "finished" }),
    );
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admin/matches");
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/admin/matches/${target.id}`);
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/id/pertandingan/${target.slug}`);
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/vi/tran-dau/${target.slug}`);
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/en/match/${target.slug}`);
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/zh/bisai/${target.slug}`);
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/th/การแข่งขัน/${target.slug}`);
  });

  it("does not audit no-op fixture status updates", async () => {
    const target = match("live");
    runtime.getRuntimeAdminMatch.mockResolvedValue(target);

    const result = await setAdminMatchStatus(target.id, "live", { confirmStatus: true });

    expect(result).toEqual({ ok: true, matchId: target.id, action: "status" });
    expect(runtime.insertRuntimeAdminAuditLog).not.toHaveBeenCalled();
    expect(runtime.setRuntimeAdminMatchStatus).not.toHaveBeenCalled();
  });

  it("rejects invalid fixture status changes before loading admin context", async () => {
    const result = await setAdminMatchStatus(88, "bad-status", { confirmStatus: true });

    expect(result).toEqual({
      ok: false,
      matchId: 88,
      action: "status",
      error: "invalid",
    });
    expect(admin.requireAdmin).not.toHaveBeenCalled();
  });
});

describe("admin media management actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    admin.requireAdmin.mockResolvedValue(actor);
    runtime.getRuntimeAdminMediaItem.mockResolvedValue(media());
    runtime.insertRuntimeAdminAuditLog.mockResolvedValue(777);
    runtime.setRuntimeAdminMediaUrl.mockResolvedValue(undefined);
    runtime.retryRuntimeAdminMediaItem.mockResolvedValue(true);
    runtime.deleteRuntimeAdminMediaItem.mockResolvedValue(undefined);
    runtime.updateRuntimeAdminAuditLogMeta.mockResolvedValue(undefined);
  });

  it("rejects invalid media URLs before loading admin context", async () => {
    const result = await setAdminMediaUrl(55, "javascript:alert(1)");

    expect(result).toEqual({
      ok: false,
      imageId: 55,
      action: "url",
      error: "invalidUrl",
    });
    expect(admin.requireAdmin).not.toHaveBeenCalled();
    expect(runtime.setRuntimeAdminMediaUrl).not.toHaveBeenCalled();
  });

  it("writes audited media URL updates without storing the full prompt", async () => {
    const target = media();
    runtime.getRuntimeAdminMediaItem.mockResolvedValue(target);

    const result = await setAdminMediaUrl(target.id, "https://cdn.example.com/new.jpg");

    expect(result).toEqual({ ok: true, imageId: target.id, action: "url" });
    expect(runtime.insertRuntimeAdminAuditLog).toHaveBeenCalledWith({
      actorId: actor.user.id,
      action: "media.url.set",
      target: `image:${target.id}`,
      meta: expect.objectContaining({
        imageId: target.id,
        fixtureId: target.fixtureId,
        fixtureSlug: target.fixture?.slug,
        kind: target.kind,
        fromStatus: "ready",
        toStatus: "ready",
        fromUrlHost: "cdn.example.com",
        toUrlHost: "cdn.example.com",
        promptLength: target.prompt?.length,
      }),
    });
    const auditInput = runtime.insertRuntimeAdminAuditLog.mock.calls[0]?.[0];
    expect(JSON.stringify(auditInput.meta)).not.toContain(target.prompt);
    expect(runtime.setRuntimeAdminMediaUrl).toHaveBeenCalledWith(
      target.id,
      "https://cdn.example.com/new.jpg",
    );
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admin/media");
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/id/pertandingan/${target.fixture?.slug}`);
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/vi/tran-dau/${target.fixture?.slug}`);
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/en/match/${target.fixture?.slug}`);
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/zh/bisai/${target.fixture?.slug}`);
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/th/การแข่งขัน/${target.fixture?.slug}`);
  });

  it("requires explicit confirmation before retrying media generation", async () => {
    const target = media({ status: "failed", url: null });
    runtime.getRuntimeAdminMediaItem.mockResolvedValue(target);

    const result = await retryAdminMediaItem(target.id);

    expect(result).toEqual({
      ok: false,
      imageId: target.id,
      action: "retry",
      error: "confirmRetry",
    });
    expect(runtime.insertRuntimeAdminAuditLog).not.toHaveBeenCalled();
    expect(runtime.retryRuntimeAdminMediaItem).not.toHaveBeenCalled();
  });

  it("does not retry a media row without a prompt", async () => {
    const target = media({ prompt: null, status: "failed", url: null });
    runtime.getRuntimeAdminMediaItem.mockResolvedValue(target);

    const result = await retryAdminMediaItem(target.id, { confirmRetry: true });

    expect(result).toEqual({
      ok: false,
      imageId: target.id,
      action: "retry",
      error: "missingPrompt",
    });
    expect(runtime.retryRuntimeAdminMediaItem).not.toHaveBeenCalled();
  });

  it("writes audited retry updates", async () => {
    const target = media({ status: "failed", url: null });
    runtime.getRuntimeAdminMediaItem.mockResolvedValue(target);

    const result = await retryAdminMediaItem(target.id, { confirmRetry: true });

    expect(result).toEqual({ ok: true, imageId: target.id, action: "retry" });
    expect(runtime.insertRuntimeAdminAuditLog).toHaveBeenCalledWith({
      actorId: actor.user.id,
      action: "media.retry",
      target: `image:${target.id}`,
      meta: expect.objectContaining({
        imageId: target.id,
        fromStatus: "failed",
        toStatus: "pending",
      }),
    });
    expect(runtime.retryRuntimeAdminMediaItem).toHaveBeenCalledWith(target.id);
    expect(runtime.updateRuntimeAdminAuditLogMeta).toHaveBeenCalledWith(
      777,
      expect.objectContaining({ status: "succeeded", fromStatus: "failed", toStatus: "pending" }),
    );
  });

  it("keeps an audit trail when retrying an already pending media row", async () => {
    const target = media({ status: "pending", url: null });
    runtime.getRuntimeAdminMediaItem.mockResolvedValue(target);

    const result = await retryAdminMediaItem(target.id, { confirmRetry: true });

    expect(result).toEqual({ ok: true, imageId: target.id, action: "retry" });
    expect(runtime.insertRuntimeAdminAuditLog).toHaveBeenCalledWith({
      actorId: actor.user.id,
      action: "media.retry",
      target: `image:${target.id}`,
      meta: expect.objectContaining({
        imageId: target.id,
        fromStatus: "pending",
        toStatus: "pending",
      }),
    });
    expect(runtime.retryRuntimeAdminMediaItem).toHaveBeenCalledWith(target.id);
  });

  it("requires explicit confirmation before deleting media rows", async () => {
    const target = media();
    runtime.getRuntimeAdminMediaItem.mockResolvedValue(target);

    const result = await deleteAdminMediaItem(target.id);

    expect(result).toEqual({
      ok: false,
      imageId: target.id,
      action: "delete",
      error: "confirmDelete",
    });
    expect(runtime.deleteRuntimeAdminMediaItem).not.toHaveBeenCalled();
  });

  it("writes audited media deletes", async () => {
    const target = media();
    runtime.getRuntimeAdminMediaItem.mockResolvedValue(target);

    const result = await deleteAdminMediaItem(target.id, { confirmDelete: true });

    expect(result).toEqual({ ok: true, imageId: target.id, action: "delete" });
    expect(runtime.insertRuntimeAdminAuditLog).toHaveBeenCalledWith({
      actorId: actor.user.id,
      action: "media.delete",
      target: `image:${target.id}`,
      meta: expect.objectContaining({
        imageId: target.id,
        fixtureId: target.fixtureId,
        kind: target.kind,
      }),
    });
    expect(runtime.deleteRuntimeAdminMediaItem).toHaveBeenCalledWith(target.id);
    expect(runtime.updateRuntimeAdminAuditLogMeta).toHaveBeenCalledWith(
      777,
      expect.objectContaining({ status: "succeeded" }),
    );
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

  it("unpublishes a published article without clearing publishedAt", async () => {
    const target = article("published");
    runtime.getRuntimeAdminArticle.mockResolvedValue(target);

    const result = await setAdminArticleStatus(target.id, "draft");

    expect(result).toEqual({ ok: true, articleId: target.id, action: "status" });
    expect(runtime.setRuntimeAdminArticleStatus).toHaveBeenCalledWith(target.id, "draft", undefined);
    expect(runtime.updateRuntimeAdminAuditLogMeta).toHaveBeenCalledWith(
      321,
      expect.objectContaining({
        status: "succeeded",
        fromStatus: "published",
        toStatus: "draft",
        fromPublishedAt: target.publishedAt?.toISOString(),
        toPublishedAt: target.publishedAt?.toISOString(),
      }),
    );
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
    runtime.getRuntimeAdminArticle.mockResolvedValueOnce(target).mockResolvedValueOnce(null);

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

  it("does not report success when a draft becomes published before delete verification", async () => {
    const target = article("draft");
    const nowPublished = article("published");
    runtime.getRuntimeAdminArticle.mockResolvedValueOnce(target).mockResolvedValueOnce(nowPublished);

    const result = await deleteAdminArticle(target.id, { confirmDelete: true });

    expect(result).toEqual({
      ok: false,
      articleId: target.id,
      action: "delete",
      error: "publishedDelete",
      response: "Article became published before delete",
    });
    expect(runtime.deleteRuntimeAdminArticle).toHaveBeenCalledWith(target.id);
    expect(runtime.updateRuntimeAdminAuditLogMeta).toHaveBeenCalledWith(
      321,
      expect.objectContaining({
        status: "failed",
        currentStatus: "published",
        error: "Article became published before delete",
      }),
    );
  });
});
