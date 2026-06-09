"use server";

import { revalidatePath } from "next/cache";
import {
  countRuntimeActiveAdmins,
  getRuntimeAdminUser,
  insertRuntimeAdminAuditLog,
  markRuntimeAdminCommentReportsReviewed,
  setRuntimeAdminUserDeleted,
  setRuntimeAdminUserRole,
  setRuntimeAdminCommentHidden,
  updateRuntimeAdminAuditLogMeta,
  type RuntimeAdminUserRole,
  type RuntimeAdminAuditMeta,
} from "./runtime-data";
import { getAdminOperation, type AdminOperationId } from "./admin-operations";
import { requireAdmin } from "./admin";

const RESPONSE_PREVIEW_LIMIT = 2_000;
const JOB_TIMEOUT_MS = 120_000;

export type RunAdminOperationResult =
  | {
      ok: true;
      operation: AdminOperationId;
      status: number;
      response: string;
    }
  | {
      ok: false;
      operation?: AdminOperationId;
      status?: number;
      error: "invalid" | "notConfigured" | "upstream" | "audit";
      response?: string;
    };

export type AdminCommentModerationResult =
  | { ok: true; commentId: number; action: "hide" | "unhide" | "review" }
  | {
      ok: false;
      commentId?: number;
      action?: "hide" | "unhide" | "review";
      error: "invalid" | "audit" | "upstream";
      response?: string;
    };

export type AdminUserManagementResult =
  | {
      ok: true;
      userId: string;
      action: "role" | "deactivate" | "restore";
    }
  | {
      ok: false;
      userId?: string;
      action?: "role" | "deactivate" | "restore";
      error:
        | "invalid"
        | "audit"
        | "upstream"
        | "notFound"
        | "confirmAdmin"
        | "selfAdmin"
        | "lastAdmin";
      response?: string;
    };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jobsAdminUrl(): string | null {
  const raw = process.env.JOBS_ADMIN_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : null;
}

function jobsAdminSecret(): string | null {
  const raw = process.env.JOBS_ADMIN_SECRET?.trim();
  return raw || null;
}

function preview(value: string): string {
  return value.length > RESPONSE_PREVIEW_LIMIT
    ? `${value.slice(0, RESPONSE_PREVIEW_LIMIT)}...`
    : value;
}

async function readResponsePreview(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  if (!text) return "";
  try {
    return JSON.stringify(JSON.parse(text), null, 2).slice(0, RESPONSE_PREVIEW_LIMIT);
  } catch {
    return preview(text);
  }
}

export async function runAdminOperation(
  operationId: AdminOperationId,
): Promise<RunAdminOperationResult> {
  const admin = await requireAdmin();
  const operation = getAdminOperation(operationId);
  if (!operation) return { ok: false, error: "invalid" };

  const target = `jobs:${operation.id}`;
  let auditId = 0;
  try {
    auditId = await insertRuntimeAdminAuditLog({
      actorId: admin.user.id,
      action: "jobs.run",
      target,
      meta: {
        operation: operation.id,
        status: "started",
        startedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.warn("[admin] audit insert failed", error);
    return { ok: false, operation: operation.id, error: "audit" };
  }

  const url = jobsAdminUrl();
  const secret = jobsAdminSecret();
  if (!url || !secret) {
    await updateRuntimeAdminAuditLogMeta(auditId, {
      operation: operation.id,
      status: "not_configured",
      finishedAt: new Date().toISOString(),
      hasUrl: !!url,
      hasSecret: !!secret,
    }).catch((error) => console.warn("[admin] audit update failed", error));
    revalidatePath("/admin/operations");
    return { ok: false, operation: operation.id, error: "notConfigured" };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), JOB_TIMEOUT_MS);
  if (typeof timeout === "object" && "unref" in timeout) {
    timeout.unref();
  }

  let meta: RuntimeAdminAuditMeta;
  try {
    const response = await fetch(`${url}${operation.path}`, {
      method: "POST",
      headers: { "x-admin-secret": secret },
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await readResponsePreview(response);
    meta = {
      operation: operation.id,
      status: response.ok ? "succeeded" : "failed",
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
      response: body,
      finishedAt: new Date().toISOString(),
    };
    await updateRuntimeAdminAuditLogMeta(auditId, meta).catch((error) =>
      console.warn("[admin] audit update failed", error),
    );
    revalidatePath("/admin/operations");
    if (!response.ok) {
      return {
        ok: false,
        operation: operation.id,
        status: response.status,
        error: "upstream",
        response: body,
      };
    }
    return { ok: true, operation: operation.id, status: response.status, response: body };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    meta = {
      operation: operation.id,
      status: "failed",
      durationMs: Date.now() - startedAt,
      error: preview(message),
      finishedAt: new Date().toISOString(),
    };
    await updateRuntimeAdminAuditLogMeta(auditId, meta).catch((auditError) =>
      console.warn("[admin] audit update failed", auditError),
    );
    revalidatePath("/admin/operations");
    return {
      ok: false,
      operation: operation.id,
      error: "upstream",
      response: preview(message),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function validCommentId(commentId: number): boolean {
  return Number.isInteger(commentId) && commentId > 0;
}

function validUserId(userId: string): boolean {
  return UUID_RE.test(userId);
}

function validAdminUserRole(role: string): role is RuntimeAdminUserRole {
  return role === "member" || role === "premium" || role === "admin";
}

async function startCommentAudit(
  actorId: string,
  action: "comments.hide" | "comments.unhide" | "comments.reports.review",
  commentId: number,
): Promise<number> {
  return insertRuntimeAdminAuditLog({
    actorId,
    action,
    target: `comment:${commentId}`,
    meta: {
      commentId,
      status: "started",
      startedAt: new Date().toISOString(),
    },
  });
}

async function finishCommentAudit(
  auditId: number,
  meta: RuntimeAdminAuditMeta,
): Promise<void> {
  await updateRuntimeAdminAuditLogMeta(auditId, {
    ...meta,
    finishedAt: new Date().toISOString(),
  }).catch((error) => console.warn("[admin] audit update failed", error));
}

export async function setAdminCommentHidden(
  commentId: number,
  hidden: boolean,
): Promise<AdminCommentModerationResult> {
  if (!validCommentId(commentId)) return { ok: false, error: "invalid" };
  const admin = await requireAdmin();
  const action = hidden ? "hide" : "unhide";
  let auditId = 0;
  try {
    auditId = await startCommentAudit(
      admin.user.id,
      hidden ? "comments.hide" : "comments.unhide",
      commentId,
    );
  } catch (error) {
    console.warn("[admin] audit insert failed", error);
    return { ok: false, commentId, action, error: "audit" };
  }

  try {
    await setRuntimeAdminCommentHidden(commentId, hidden);
    await finishCommentAudit(auditId, {
      commentId,
      status: "succeeded",
      hidden,
    });
    revalidatePath("/admin/comments");
    return { ok: true, commentId, action };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await finishCommentAudit(auditId, {
      commentId,
      status: "failed",
      hidden,
      error: preview(message),
    });
    revalidatePath("/admin/comments");
    return { ok: false, commentId, action, error: "upstream", response: preview(message) };
  }
}

export async function reviewAdminCommentReports(
  commentId: number,
): Promise<AdminCommentModerationResult> {
  if (!validCommentId(commentId)) return { ok: false, error: "invalid" };
  const admin = await requireAdmin();
  let auditId = 0;
  try {
    auditId = await startCommentAudit(admin.user.id, "comments.reports.review", commentId);
  } catch (error) {
    console.warn("[admin] audit insert failed", error);
    return { ok: false, commentId, action: "review", error: "audit" };
  }

  try {
    await markRuntimeAdminCommentReportsReviewed(commentId, admin.user.id);
    await finishCommentAudit(auditId, {
      commentId,
      status: "succeeded",
      reviewed: true,
    });
    revalidatePath("/admin/comments");
    return { ok: true, commentId, action: "review" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await finishCommentAudit(auditId, {
      commentId,
      status: "failed",
      reviewed: true,
      error: preview(message),
    });
    revalidatePath("/admin/comments");
    return { ok: false, commentId, action: "review", error: "upstream", response: preview(message) };
  }
}

async function startUserAudit(
  actorId: string,
  action: "users.role.set" | "users.deactivate" | "users.restore",
  userId: string,
  meta: RuntimeAdminAuditMeta,
): Promise<number> {
  return insertRuntimeAdminAuditLog({
    actorId,
    action,
    target: `user:${userId}`,
    meta: {
      ...meta,
      userId,
      status: "started",
      startedAt: new Date().toISOString(),
    },
  });
}

async function finishUserAudit(
  auditId: number,
  meta: RuntimeAdminAuditMeta,
): Promise<void> {
  await updateRuntimeAdminAuditLogMeta(auditId, {
    ...meta,
    finishedAt: new Date().toISOString(),
  }).catch((error) => console.warn("[admin] audit update failed", error));
}

export async function setAdminUserRole(
  userId: string,
  role: string,
  options: { confirmAdminChange?: boolean } = {},
): Promise<AdminUserManagementResult> {
  if (!validUserId(userId) || !validAdminUserRole(role)) {
    return { ok: false, userId, action: "role", error: "invalid" };
  }
  const admin = await requireAdmin();
  const target = await getRuntimeAdminUser(userId).catch((error) => {
    console.warn("[admin] user lookup failed", error);
    return null;
  });
  if (!target) return { ok: false, userId, action: "role", error: "notFound" };
  if (target.role === role) return { ok: true, userId, action: "role" };

  const touchesAdminRole = target.role === "admin" || role === "admin";
  if (touchesAdminRole && !options.confirmAdminChange) {
    return { ok: false, userId, action: "role", error: "confirmAdmin" };
  }
  if (target.role === "admin" && role !== "admin") {
    if (target.id === admin.user.id) {
      return { ok: false, userId, action: "role", error: "selfAdmin" };
    }
    const activeAdmins = await countRuntimeActiveAdmins().catch(() => 0);
    if (activeAdmins <= 1) return { ok: false, userId, action: "role", error: "lastAdmin" };
  }

  let auditId = 0;
  try {
    auditId = await startUserAudit(admin.user.id, "users.role.set", userId, {
      fromRole: target.role,
      toRole: role,
    });
  } catch (error) {
    console.warn("[admin] audit insert failed", error);
    return { ok: false, userId, action: "role", error: "audit" };
  }

  try {
    await setRuntimeAdminUserRole(userId, role);
    await finishUserAudit(auditId, {
      status: "succeeded",
      fromRole: target.role,
      toRole: role,
    });
    revalidatePath("/admin/users");
    revalidatePath("/admin");
    return { ok: true, userId, action: "role" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await finishUserAudit(auditId, {
      status: "failed",
      fromRole: target.role,
      toRole: role,
      error: preview(message),
    });
    revalidatePath("/admin/users");
    return { ok: false, userId, action: "role", error: "upstream", response: preview(message) };
  }
}

export async function setAdminUserDeleted(
  userId: string,
  deleted: boolean,
  options: { confirmAdminChange?: boolean } = {},
): Promise<AdminUserManagementResult> {
  if (!validUserId(userId)) return { ok: false, userId, error: "invalid" };
  const admin = await requireAdmin();
  const action = deleted ? "deactivate" : "restore";
  const target = await getRuntimeAdminUser(userId).catch((error) => {
    console.warn("[admin] user lookup failed", error);
    return null;
  });
  if (!target) return { ok: false, userId, action, error: "notFound" };
  if (Boolean(target.deletedAt) === deleted) return { ok: true, userId, action };

  if (deleted && target.role === "admin") {
    if (!options.confirmAdminChange) {
      return { ok: false, userId, action, error: "confirmAdmin" };
    }
    if (target.id === admin.user.id) {
      return { ok: false, userId, action, error: "selfAdmin" };
    }
    const activeAdmins = await countRuntimeActiveAdmins().catch(() => 0);
    if (activeAdmins <= 1) return { ok: false, userId, action, error: "lastAdmin" };
  }

  let auditId = 0;
  try {
    auditId = await startUserAudit(
      admin.user.id,
      deleted ? "users.deactivate" : "users.restore",
      userId,
      {
        role: target.role,
        deleted,
      },
    );
  } catch (error) {
    console.warn("[admin] audit insert failed", error);
    return { ok: false, userId, action, error: "audit" };
  }

  try {
    await setRuntimeAdminUserDeleted(userId, deleted);
    await finishUserAudit(auditId, {
      status: "succeeded",
      role: target.role,
      deleted,
    });
    revalidatePath("/admin/users");
    revalidatePath("/admin");
    return { ok: true, userId, action };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await finishUserAudit(auditId, {
      status: "failed",
      role: target.role,
      deleted,
      error: preview(message),
    });
    revalidatePath("/admin/users");
    return { ok: false, userId, action, error: "upstream", response: preview(message) };
  }
}
