"use server";

import { revalidatePath } from "next/cache";
import {
  insertRuntimeAdminAuditLog,
  updateRuntimeAdminAuditLogMeta,
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
